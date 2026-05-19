import crypto from 'crypto';
import { HostRepository, HostRow } from '../repositories/HostRepository';

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeRegistrationCode(raw: string): string {
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

// ─── Validator (nama saja — duplikat nama TIDAK divalidasi karena host_code jadi pembeda) ───

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
        throw { status: 400, message: `Nama terlalu pendek (min. ${HOST_NAME_RULES.minChars} karakter)` };
    }

    if (name.length > HOST_NAME_RULES.maxChars) {
        throw { status: 400, message: `Nama terlalu panjang (maks. ${HOST_NAME_RULES.maxChars} karakter)` };
    }

    const wordCount = name.split(' ').filter(w => w.length > 0).length;
    if (wordCount < HOST_NAME_RULES.minWords) {
        throw { status: 400, message: 'Nama harus terdiri dari minimal 2 kata' };
    }

    if (!HOST_NAME_RULES.pattern.test(name)) {
        throw { status: 400, message: 'Nama hanya boleh mengandung huruf, spasi, titik, atau apostrof' };
    }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class HostService {
    private hostRepo = new HostRepository();

    private async generateRegistrationCode(): Promise<string> {
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

    async getById(id: number): Promise<HostRow> {
        const host = await this.hostRepo.findById(id);
        if (!host) throw { status: 404, message: 'Host tidak ditemukan' };
        if (host.telegram_chat_id) return host;
        return this.ensurePendingRegistrationCode(host);
    }

    async create(data: { full_name: string }): Promise<HostRow> {
        if (!data.full_name?.trim()) {
            throw { status: 400, message: 'Nama lengkap wajib diisi' };
        }

        const normalized = normalizeHostName(data.full_name);
        validateHostName(normalized);

        // host_code di-generate otomatis di repository (KSW-XXXX dari id)
        // Tidak ada cek duplikat nama — host_code yang menjadi pembeda unik
        const host = await this.hostRepo.create({ full_name: normalized });
        const code = await this.generateRegistrationCode();
        await this.hostRepo.insertRegistrationCode(host.id, code);
        return { ...host, pending_registration_code: code };
    }

    async update(id: number, data: { full_name?: string }) {
        const existing = await this.hostRepo.findById(id);
        if (!existing) throw { status: 404, message: 'Host tidak ditemukan' };

        if (data.full_name !== undefined) {
            if (!data.full_name.trim()) {
                throw { status: 400, message: 'Nama lengkap wajib diisi' };
            }
            const normalized = normalizeHostName(data.full_name);
            validateHostName(normalized);
            data.full_name = normalized;
        }

        return this.hostRepo.update(id, data);
    }

    async delete(id: number): Promise<void> {
        const existing = await this.hostRepo.findById(id);
        if (!existing) throw { status: 404, message: 'Host tidak ditemukan' };
        await this.hostRepo.delete(id);
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
