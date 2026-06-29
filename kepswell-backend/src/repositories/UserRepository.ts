import { query } from '../config/db';
import { User } from '../types';

export class UserRepository {
    async findByEmail(email: string): Promise<User | null> {
        const result = await query(
            'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
            [email]
        );
        return result.rows[0] || null;
    }

    async findById(id: number): Promise<User | null> {
        const result = await query(
            'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    async findAll(): Promise<User[]> {
        const result = await query(
            'SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC'
        );
        return result.rows;
    }

    async create(email: string, full_name: string, password_hash: string, role: string): Promise<User> {
        const result = await query(
            `INSERT INTO users (email, full_name, password_hash, role)
             VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, is_active`,
            [email, full_name, password_hash, role]
        );
        return result.rows[0];
    }

    async delete(id: number): Promise<void> {
        await query('DELETE FROM users WHERE id = $1', [id]);
    }
    async updateProfile(id: number, full_name?: string, password_hash?: string): Promise<User | null> {
        let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
        const params: any[] = [];
        let idx = 1;

        if (full_name) {
            updateQuery += `, full_name = $${idx++}`;
            params.push(full_name);
        }
        if (password_hash) {
            updateQuery += `, password_hash = $${idx++}`;
            params.push(password_hash);
        }

        updateQuery += ` WHERE id = $${idx} RETURNING id, email, full_name, role, is_active`;
        params.push(id);

        const result = await query(updateQuery, params);
        return result.rows[0] || null;
    }
}
