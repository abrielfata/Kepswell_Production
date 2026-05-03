import crypto from 'crypto';
import { HostRepository } from '../repositories/HostRepository';

export class HostService {
    private hostRepo = new HostRepository();

    async getAll(isActive?: boolean) {
        return this.hostRepo.findAll(isActive);
    }

    async getById(id: number) {
        const host = await this.hostRepo.findById(id);
        if (!host) throw { status: 404, message: 'Host not found' };
        return host;
    }

    async create(data: { full_name: string }) {
        if (!data.full_name?.trim()) {
            throw { status: 400, message: 'Full name is required' };
        }

        const binding_token = crypto.randomBytes(16).toString('hex');

        return this.hostRepo.create({
            full_name: data.full_name.trim(),
            binding_token,
        });
    }

    async update(id: number, data: { full_name?: string; is_active?: boolean }) {
        const existing = await this.hostRepo.findById(id);
        if (!existing) throw { status: 404, message: 'Host not found' };
        return this.hostRepo.update(id, data);
    }

    async delete(id: number) {
        const existing = await this.hostRepo.findById(id);
        if (!existing) throw { status: 404, message: 'Host not found' };
        await this.hostRepo.delete(id);
        return { message: 'Host deleted successfully' };
    }

    async toggleStatus(id: number) {
        const host = await this.hostRepo.findById(id);
        if (!host) throw { status: 404, message: 'Host not found' };
        return this.hostRepo.update(id, { is_active: !host.is_active });
    }

    async regenerateToken(id: number) {
        const host = await this.hostRepo.findById(id);
        if (!host) throw { status: 404, message: 'Host not found' };
        const binding_token = crypto.randomBytes(16).toString('hex');
        return this.hostRepo.update(id, { binding_token });
    }

    async bindTelegram(token: string, telegramUserId: string) {
        const host = await this.hostRepo.findByBindingToken(token);
        if (!host) throw { status: 404, message: 'Invalid binding token' };

        if (host.telegram_user_id) {
            throw { status: 400, message: 'Host already bound to a Telegram account' };
        }

        return this.hostRepo.update(host.id, {
            telegram_user_id: telegramUserId,
            binding_token: null,
        });
    }
}
