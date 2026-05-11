import crypto from 'crypto';
import { HostRepository, HostRow } from '../repositories/HostRepository';

function normalizeRegistrationCode(raw: string): string {
    return raw.trim().toUpperCase();
}

export class HostService {
    private hostRepo = new HostRepository();

    private async generateUniqueRegistrationCode(): Promise<string> {
        const maxAttempts = 50;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const code = crypto.randomBytes(6).toString('hex').toUpperCase();
            const exists = await this.hostRepo.registrationCodeExists(code);
            if (!exists) return code;
        }
        throw {
            status: 503,
            message: 'Could not generate a unique registration code; try again',
        };
    }

    /** Pastikan host yang belum aktivasi punya tepat satu kode pending (data lama / tanpa baris kode). */
    private async ensurePendingRegistrationCode(host: HostRow): Promise<HostRow> {
        if (host.telegram_chat_id) return host;
        const existing = await this.hostRepo.findPendingRegistrationCode(host.id);
        if (existing) return { ...host, pending_registration_code: existing };
        const code = await this.generateUniqueRegistrationCode();
        await this.hostRepo.insertRegistrationCode(host.id, code);
        return { ...host, pending_registration_code: code };
    }

    async getAll(isActive?: boolean): Promise<HostRow[]> {
        const rows = await this.hostRepo.findAll(isActive);
        return Promise.all(
            rows.map(async (h) => {
                if (h.telegram_chat_id) return h;
                return this.ensurePendingRegistrationCode(h);
            })
        );
    }

    async getById(id: number): Promise<HostRow> {
        const host = await this.hostRepo.findById(id);
        if (!host) throw { status: 404, message: 'Host not found' };
        if (host.telegram_chat_id) return host;
        return this.ensurePendingRegistrationCode(host);
    }

    async create(data: { full_name: string }): Promise<HostRow> {
        if (!data.full_name?.trim()) {
            throw { status: 400, message: 'Nama lengkap wajib diisi' };
        }

        const duplicate = await this.hostRepo.findByFullName(data.full_name.trim());
        if (duplicate) {
            throw { status: 409, message: `Host dengan nama "${data.full_name.trim()}" sudah terdaftar` };
        }

        const host = await this.hostRepo.create({
            full_name: data.full_name.trim(),
        });
        const code = await this.generateUniqueRegistrationCode();
        await this.hostRepo.insertRegistrationCode(host.id, code);
        return { ...host, pending_registration_code: code };
    }

    async update(id: number, data: { full_name?: string }) {
        const existing = await this.hostRepo.findById(id);
        if (!existing) throw { status: 404, message: 'Host tidak ditemukan' };

        if (data.full_name?.trim()) {
            const nameToCheck = data.full_name.trim();
            const duplicate = await this.hostRepo.findByFullName(nameToCheck);
            if (duplicate && duplicate.id !== id) {
                throw { status: 409, message: `Host dengan nama "${nameToCheck}" sudah terdaftar` };
            }
            data.full_name = nameToCheck;
        }

        return this.hostRepo.update(id, data);
    }

    async delete(id: number) {
        const existing = await this.hostRepo.findById(id);
        if (!existing) throw { status: 404, message: 'Host tidak ditemukan' };
        await this.hostRepo.delete(id);
        return { message: 'Host berhasil dihapus' };
    }

    /** Host belum aktivasi: buang kode belum terpakai, buat kode baru (sekali pakai). */
    async regenerateRegistrationCode(id: number): Promise<HostRow> {
        const host = await this.hostRepo.findById(id);
        if (!host) throw { status: 404, message: 'Host not found' };
        if (host.telegram_chat_id) {
            throw { status: 400, message: 'Host already activated; registration code cannot be changed' };
        }

        await this.hostRepo.deleteUnusedRegistrationCodesForHost(id);
        const code = await this.generateUniqueRegistrationCode();
        await this.hostRepo.insertRegistrationCode(id, code);
        return { ...host, pending_registration_code: code };
    }

    /** Dipanggil dari bot Telegram setelah validasi input. */
    async activateByRegistrationCode(rawCode: string, telegramChatId: string) {
        const code = normalizeRegistrationCode(rawCode);
        if (!code) {
            return { status: 'invalid_code' as const };
        }
        const result = await this.hostRepo.activateByRegistrationCode(code, telegramChatId);
        return { status: result };
    }
}
