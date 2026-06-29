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

    private async verifyPassword(password: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(password, hash);
    }

    async updateProfile(id: number, full_name?: string, password?: string) {
        let password_hash;
        if (password) {
            password_hash = await bcrypt.hash(password, 10);
        }
        const updated = await this.userRepo.updateProfile(id, full_name, password_hash);
        if (!updated) throw new AppError('User not found', 404);
        return updated;
    }

    async getManagers() {
        return await this.userRepo.findAll();
    }

    async createManager(email: string, full_name: string, password?: string, role: string = 'MANAGER') {
        if (role === 'OWNER') {
            throw new AppError('Cannot create Owner account via this API', 400);
        }
        const existing = await this.userRepo.findByEmail(email);
        if (existing) {
            throw new AppError('Email already exists', 400);
        }
        const pwd = password || 'password123';
        const password_hash = await bcrypt.hash(pwd, 10);
        return await this.userRepo.create(email, full_name, password_hash, role);
    }

    async deleteManager(id: number) {
        const user = await this.userRepo.findById(id);
        if (user?.role === 'OWNER') {
            throw new AppError('Cannot delete the Owner account', 400);
        }
        return await this.userRepo.delete(id);
    }
}
