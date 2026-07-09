import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { ENV } from '../config/env';
import { AppError } from '../utils/AppError';

export type LoginResult = {
    token: string;
    user: {
        id: number;
        email: string;
        full_name: string;
        role: string;
    };
};

export class AuthService {
    private userRepo = new UserRepository();

    async authenticateUser(email: string, password: string): Promise<LoginResult> {
        if (!email || !password) {
            throw new AppError('Email and password are required', 400);
        }

        const user = await this.userRepo.findByEmail(email);
        if (!user) {
            throw new AppError('Invalid email or password', 401);
        }

        const isValid = await this.verifyPassword(password, user.password_hash);
        if (!isValid) {
            throw new AppError('Invalid email or password', 401);
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            ENV.JWT_SECRET,
            { expiresIn: ENV.JWT_EXPIRES_IN } as any
        );

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
            },
        };
    }

    async getMe(id: number) {
        const user = await this.userRepo.findById(id);
        if (!user) throw new AppError('User not found', 404);
        return user;
    }

    async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
        const user = await this.userRepo.findById(userId);
        if (!user) throw new AppError('User not found', 404);

        // Fetch password_hash directly (findById doesn't return it)
        const result = await (await import('../config/db')).query(
            'SELECT password_hash FROM users WHERE id = $1', [userId]
        );
        const hash = result.rows[0]?.password_hash;
        if (!hash) throw new AppError('User not found', 404);

        const isValid = await bcrypt.compare(oldPassword, hash);
        if (!isValid) throw new AppError('Password lama tidak sesuai', 400);

        if (newPassword.length < 6)
            throw new AppError('Password baru minimal 6 karakter', 400);

        const newHash = await bcrypt.hash(newPassword, 10);
        await this.userRepo.updatePassword(userId, newHash);
    }

    private async verifyPassword(password: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(password, hash);
    }
}
