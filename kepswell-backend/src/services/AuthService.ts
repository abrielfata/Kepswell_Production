import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { ENV } from '../config/env';

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

    async login(email: string, password: string): Promise<LoginResult> {
        if (!email || !password) {
            throw { status: 400, message: 'Email and password are required' };
        }

        const user = await this.userRepo.findByEmail(email);
        if (!user) {
            throw { status: 401, message: 'Invalid email or password' };
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw { status: 401, message: 'Invalid email or password' };
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
        if (!user) throw { status: 404, message: 'User not found' };
        return user;
    }
}
