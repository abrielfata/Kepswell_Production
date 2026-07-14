import { query, withTransaction } from '../config/db';
import type { Host } from '../types';
import { hashChatId, encrypt, decrypt } from '../utils/security';

const hostSelect = `
    SELECT h.*,
           (SELECT rc.code FROM host_registration_codes rc
            WHERE rc.host_id = h.id AND rc.used_at IS NULL
            ORDER BY rc.created_at DESC LIMIT 1) AS pending_registration_code
    FROM hosts h
`;

export type HostRow = Host;

const mapHostRow = (row: any): HostRow => {
    if (!row) return row;
    return {
        ...row,
        telegram_chat_id: row.telegram_chat_id ? decrypt(row.telegram_chat_id) : null,
    };
};

export class HostRepository {
    async findAll(isActive?: boolean): Promise<HostRow[]> {
        let sql = hostSelect;
        const params: unknown[] = [];

        if (isActive !== undefined) {
            sql += ' WHERE h.is_active = $1';
            params.push(isActive);
        }

        sql += ' ORDER BY h.created_at DESC';
        const result = await query(sql, params);
        return result.rows.map(mapHostRow);
    }

    async findById(id: number): Promise<HostRow | null> {
        const result = await query(`${hostSelect} WHERE h.id = $1`, [id]);
        return mapHostRow(result.rows[0]);
    }

    async findHostByChatId(telegramChatId: string): Promise<HostRow | null> {
        const hash = hashChatId(telegramChatId);
        const result = await query(`${hostSelect} WHERE h.telegram_chat_id_hash = $1`, [hash]);
        return mapHostRow(result.rows[0]);
    }

    /**
     * Buat host baru dalam satu transaksi:
     * 1. INSERT ke tabel hosts
     * 2. Langsung UPDATE host_code = 'KSW-[YYMM]-[NNNN]'
     *    - YYMM  : tahun & bulan join (contoh: 2507 untuk Juli 2025)
     *    - NNNN  : nomor urut global dari id, dipadding 4 digit
     *    Contoh hasil: KSW-2507-0001
     * Sehingga host_code selalu konsisten dengan id dan tidak bisa NULL.
     */
    async insertHostRecord(data: { full_name: string }): Promise<Host> {
        return withTransaction(async (client) => {
            const insertRes = await client.query<Host>(
                `INSERT INTO hosts (full_name) VALUES ($1) RETURNING *`,
                [data.full_name]
            );
            const inserted = insertRes.rows[0];

            const updateRes = await client.query<Host>(
                `UPDATE hosts
                 SET host_code = 'KSW-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYMM') || '-' || LPAD(id::text, 4, '0'),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1
                 RETURNING *`,
                [inserted.id]
            );
            return updateRes.rows[0];
        });
    }

    async update(id: number, data: Partial<{
        full_name: string;
        telegram_chat_id: string | null;
    }>): Promise<Host | null> {
        const fields: string[] = [];
        const params: unknown[] = [];
        let idx = 1;

        if (data.full_name !== undefined) {
            fields.push(`full_name = $${idx++}`);
            params.push(data.full_name);
        }
        if (data.telegram_chat_id !== undefined) {
            fields.push(`telegram_chat_id = $${idx++}`);
            params.push(data.telegram_chat_id);
        }

        if (fields.length === 0) return null;

        params.push(id);
        const result = await query(
            `UPDATE hosts SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${idx} RETURNING *`,
            params
        );
        return mapHostRow(result.rows[0]);
    }

    async deactivateHostRecord(id: number): Promise<boolean> {
        await query('DELETE FROM host_registration_codes WHERE host_id = $1 AND used_at IS NULL', [id]);
        const result = await query(`
            UPDATE hosts 
            SET is_active = false, 
                telegram_chat_id = NULL, 
                telegram_chat_id_hash = NULL,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1
        `, [id]);
        return (result.rowCount ?? 0) > 0;
    }

    async registrationCodeExists(code: string): Promise<boolean> {
        const result = await query(
            'SELECT 1 FROM host_registration_codes WHERE code = $1 LIMIT 1',
            [code]
        );
        return (result.rowCount ?? 0) > 0;
    }

    async insertRegistrationCode(hostId: number, code: string): Promise<void> {
        await query(
            `INSERT INTO host_registration_codes (host_id, code) VALUES ($1, $2)`,
            [hostId, code]
        );
    }

    async deleteUnusedRegistrationCodesForHost(hostId: number): Promise<void> {
        await query(
            'DELETE FROM host_registration_codes WHERE host_id = $1 AND used_at IS NULL',
            [hostId]
        );
    }

    async findPendingRegistrationCode(hostId: number): Promise<string | null> {
        const result = await query(
            `SELECT code FROM host_registration_codes
             WHERE host_id = $1 AND used_at IS NULL AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [hostId]
        );
        return result.rows[0]?.code ?? null;
    }

    /**
     * Satu transaksi: kunci baris kode, cek Chat ID unik, pasang ke host, tandai kode terpakai.
     */
    async updateChatIdByCode(
        normalizedCode: string,
        telegramChatId: string,
    ): Promise<'ok' | 'invalid_code' | 'chat_already_host' | 'host_already_active' | 'concurrent'> {
        const hash = hashChatId(telegramChatId);
        const encrypted = encrypt(telegramChatId);

        return withTransaction(async (client) => {
            const codeRes = await client.query<{ id: number; host_id: number }>(
                `SELECT id, host_id FROM host_registration_codes
                 WHERE code = $1 AND used_at IS NULL AND expires_at > NOW()
                 FOR UPDATE`,
                [normalizedCode]
            );
            if (codeRes.rowCount === 0) return 'invalid_code';

            const codeRow   = codeRes.rows[0];
            const codeId    = codeRow.id;
            const hostId    = codeRow.host_id;

            const taken = await client.query(
                'SELECT id FROM hosts WHERE telegram_chat_id_hash = $1',
                [hash]
            );
            if ((taken.rowCount ?? 0) > 0) return 'chat_already_host';

            const hostRes = await client.query<{ telegram_chat_id_hash: string | null }>(
                'SELECT telegram_chat_id_hash FROM hosts WHERE id = $1 FOR UPDATE',
                [hostId]
            );
            if (hostRes.rowCount === 0) return 'invalid_code';
            if (hostRes.rows[0].telegram_chat_id_hash) return 'host_already_active';

            const upd = await client.query(
                `UPDATE hosts
                 SET telegram_chat_id = $1, telegram_chat_id_hash = $2, 
                     activated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3 AND telegram_chat_id_hash IS NULL
                 RETURNING id`,
                [encrypted, hash, hostId]
            );
            if (upd.rowCount === 0) return 'concurrent';

            await client.query(
                `UPDATE host_registration_codes
                 SET used_at = CURRENT_TIMESTAMP, used_telegram_chat_id = $1
                 WHERE id = $2`,
                [encrypted, codeId]
            );
            return 'ok';
        });
    }
}
