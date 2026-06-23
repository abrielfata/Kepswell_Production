import crypto from 'crypto';
import { HostRepository, HostRow } from '../repositories/HostRepository';
import { AppError } from '../utils/AppError';



function formatRegistrationCode(raw: string): string {
    return raw.trim().toUpperCase();
}

/**
 * Normalisasi nama host sebelum disimpan:
 * - Trim ujung
 * - Ganti spasi ganda (atau lebih) di tengah dengan 1 spasi
 */
function normalizeHostName(raw: string): string {
    return raw.trim().replace(/\s{2,}/g, ' ');
}



const HOST_NAME_RULES = {
    minChars: 3,
    maxChars: 100,
    minWords: 2,
    pattern: /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s.']*$/,
} as const;

/**
 * Validasi format nama host. Melempar { status, message } jika tidak valid.
 * Dipanggil SETELAH normalisasi sehingga spasi ganda sudah bersih.
 */
function validateHostName(name: string): void {
    if (name.length < HOST_NAME_RULES.minChars) {
        throw new AppError(`Nama terlalu pendek (min. ${HOST_NAME_RULES.minChars} karakter)`, 400);
    }

    if (name.length > HOST_NAME_RULES.maxChars) {
        throw new AppError(`Nama terlalu panjang (maks. ${HOST_NAME_RULES.maxChars} karakter)`, 400);
    }

    const wordCount = name.split(' ').filter(w => w.length > 0).length;
    if (wordCount < HOST_NAME_RULES.minWords) {
        throw new AppError('Nama harus terdiri dari minimal 2 kata', 400);
    }

    if (!HOST_NAME_RULES.pattern.test(name)) {
        throw new AppError('Nama hanya boleh mengandung huruf, spasi, titik, atau apostrof', 400);
    }
}



export class HostService {
    private hostRepo = new HostRepository();

    private async generateRegistrationCode(): Promise<string> {
        const maxAttempts = 50;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const code = crypto.randomBytes(6).toString('hex').toUpperCase();
            const exists = await this.hostRepo.registrationCodeExists(code);
            if (!exists) return code;
        }
        throw new AppError('Could not generate a unique registration code; try again', 503);
    }

    /** Pastikan host yang belum aktivasi punya tepat satu kode pending (data lama / tanpa baris kode). */
    private async ensurePendingRegistrationCode(host: HostRow): Promise<HostRow> {
        if (host.telegram_chat_id) return host;
        const existing = await this.hostRepo.findPendingRegistrationCode(host.id);
        if (existing) return { ...host, pending_registration_code: existing };
        const code = await this.generateRegistrationCode();
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

    async findHostById(id: number): Promise<HostRow> {
        const host = await this.hostRepo.findById(id);
        if (!host) throw new AppError('Host tidak ditemukan', 404);
        if (host.telegram_chat_id) return host;
        return this.ensurePendingRegistrationCode(host);
    }

    async registerNewHost(data: { full_name: string }): Promise<HostRow> {
        if (!data.full_name?.trim()) {
            throw new AppError('Nama lengkap wajib diisi', 400);
        }

        const normalized = normalizeHostName(data.full_name);
        validateHostName(normalized);


        const host = await this.hostRepo.insertHostRecord({ full_name: normalized });
        const code = await this.generateRegistrationCode();
        await this.hostRepo.insertRegistrationCode(host.id, code);
        return { ...host, pending_registration_code: code };
    }

    async update(id: number, data: { full_name?: string }) {
        const existing = await this.hostRepo.findById(id);
        if (!existing) throw new AppError('Host tidak ditemukan', 404);

        if (data.full_name !== undefined) {
            if (!data.full_name.trim()) {
                throw new AppError('Nama lengkap wajib diisi', 400);
            }
            const normalized = normalizeHostName(data.full_name);
            validateHostName(normalized);
            data.full_name = normalized;
        }

        return this.hostRepo.update(id, data);
    }

    async removeHostData(id: number): Promise<void> {
        const existing = await this.hostRepo.findById(id);
        if (!existing) throw new AppError('Host tidak ditemukan', 404);
        await this.hostRepo.deactivateHostRecord(id);
    }

    async getHostByTelegramId(telegramChatId: string): Promise<HostRow | null> {
        return this.hostRepo.findHostByChatId(telegramChatId);
    }


    /** Dipanggil dari bot Telegram setelah validasi input. */
    async linkTelegramAccount(rawCode: string, telegramChatId: string) {
        const code = formatRegistrationCode(rawCode);
        if (!code) {
            return { status: 'invalid_code' as const };
        }
        const result = await this.hostRepo.updateChatIdByCode(code, telegramChatId);
        return { status: result };
    }
}
