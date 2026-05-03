import { query } from '../config/db';
import { Host } from '../types';

export class HostRepository {
    async findAll(isActive?: boolean): Promise<Host[]> {
        let sql = 'SELECT * FROM hosts';
        const params: any[] = [];

        if (isActive !== undefined) {
            sql += ' WHERE is_active = $1';
            params.push(isActive);
        }

        sql += ' ORDER BY created_at DESC';
        const result = await query(sql, params);
        return result.rows;
    }

    async findById(id: number): Promise<Host | null> {
        const result = await query('SELECT * FROM hosts WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    async findByTelegramId(telegramUserId: string): Promise<Host | null> {
        const result = await query(
            'SELECT * FROM hosts WHERE telegram_user_id = $1',
            [telegramUserId]
        );
        return result.rows[0] || null;
    }

    async findByBindingToken(token: string): Promise<Host | null> {
        const result = await query(
            'SELECT * FROM hosts WHERE binding_token = $1',
            [token]
        );
        return result.rows[0] || null;
    }

    async create(data: {
        full_name: string;
        binding_token: string;
    }): Promise<Host> {
        const result = await query(
            `INSERT INTO hosts (full_name, binding_token)
             VALUES ($1, $2)
             RETURNING *`,
            [data.full_name, data.binding_token]
        );
        return result.rows[0];
    }

    async update(id: number, data: Partial<{
        full_name: string;
        telegram_user_id: string;
        binding_token: string | null;
        is_active: boolean;
    }>): Promise<Host | null> {
        const fields: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (data.full_name !== undefined) {
            fields.push(`full_name = $${idx++}`);
            params.push(data.full_name);
        }
        if (data.telegram_user_id !== undefined) {
            fields.push(`telegram_user_id = $${idx++}`);
            params.push(data.telegram_user_id);
        }
        if (data.binding_token !== undefined) {
            fields.push(`binding_token = $${idx++}`);
            params.push(data.binding_token);
        }
        if (data.is_active !== undefined) {
            fields.push(`is_active = $${idx++}`);
            params.push(data.is_active);
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
}
