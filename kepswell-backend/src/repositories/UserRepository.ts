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
}
