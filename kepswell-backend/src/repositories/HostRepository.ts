import { query, withTransaction } from '../config/db';
import type { Host } from '../types';

const hostSelect = `
    SELECT h.*,
           (SELECT rc.code FROM host_registration_codes rc
            WHERE rc.host_id = h.id AND rc.used_at IS NULL
            ORDER BY rc.created_at DESC LIMIT 1) AS pending_registration_code
    FROM hosts h
`;

export type HostRow = Host;

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
        return result.rows;
    }

    async findById(id: number): Promise<HostRow | null> {
        const result = await query(`${hostSelect} WHERE h.id = $1`, [id]);
        return result.rows[0] || null;
    }

    async findByTelegramChatId(telegramChatId: string): Promise<HostRow | null> {
        const result = await query(`${hostSelect} WHERE h.telegram_chat_id = $1`, [telegramChatId]);
        return result.rows[0] || null;
    }

    async findByFullName(fullName: string): Promise<HostRow | null> {
        const result = await query(
            `${hostSelect} WHERE LOWER(TRIM(h.full_name)) = LOWER(TRIM($1))`,
            [fullName]
        );
        return result.rows[0] || null;
    }

    async create(data: { full_name: string }): Promise<Host> {
        const result = await query(
            `INSERT INTO hosts (full_name) VALUES ($1) RETURNING *`,
            [data.full_name]
        );
        return result.rows[0];
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
        return result.rows[0] || null;
    }

    async delete(id: number): Promise<boolean> {
        const result = await query('DELETE FROM hosts WHERE id = $1', [id]);
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
             WHERE host_id = $1 AND used_at IS NULL
             ORDER BY created_at DESC LIMIT 1`,
            [hostId]
        );
        return result.rows[0]?.code ?? null;
    }

    /**
     * Satu transaksi: kunci baris kode, cek Chat ID unik, pasang ke host, tandai kode terpakai.
     */
    async activateByRegistrationCode(
        normalizedCode: string,
        telegramChatId: string,
    ): Promise<'ok' | 'invalid_code' | 'chat_already_host' | 'host_already_active' | 'concurrent'> {
        return withTransaction(async (client) => {
            const codeRes = await client.query<{ id: number; host_id: number }>(
                `SELECT id, host_id FROM host_registration_codes
                 WHERE code = $1 AND used_at IS NULL
                 FOR UPDATE`,
                [normalizedCode]
            );
            if (codeRes.rowCount === 0) return 'invalid_code';

            const codeRow   = codeRes.rows[0];
            const codeId    = codeRow.id;
            const hostId    = codeRow.host_id;

            const taken = await client.query(
                'SELECT id FROM hosts WHERE telegram_chat_id = $1',
                [telegramChatId]
            );
            if ((taken.rowCount ?? 0) > 0) return 'chat_already_host';

            const hostRes = await client.query<{ telegram_chat_id: string | null }>(
                'SELECT telegram_chat_id FROM hosts WHERE id = $1 FOR UPDATE',
                [hostId]
            );
            if (hostRes.rowCount === 0) return 'invalid_code';
            if (hostRes.rows[0].telegram_chat_id) return 'host_already_active';

            const upd = await client.query(
                `UPDATE hosts
                 SET telegram_chat_id = $1, activated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 AND telegram_chat_id IS NULL
                 RETURNING id`,
                [telegramChatId, hostId]
            );
            if (upd.rowCount === 0) return 'concurrent';

            await client.query(
                `UPDATE host_registration_codes
                 SET used_at = CURRENT_TIMESTAMP, used_telegram_chat_id = $1
                 WHERE id = $2`,
                [telegramChatId, codeId]
            );
            return 'ok';
        });
    }
}
