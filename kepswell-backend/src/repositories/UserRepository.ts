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
