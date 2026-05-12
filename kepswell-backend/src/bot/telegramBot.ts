import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ENV } from '../config/env';
import { HostRepository } from '../repositories/HostRepository';
import { ReportRepository } from '../repositories/ReportRepository';
import { HostService } from '../services/HostService';
import { extractFromImage } from './ocrService';

const hostRepo    = new HostRepository();
const hostService = new HostService();
const reportRepo  = new ReportRepository();
const BASE_URL   = `https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}`;

// ── Rate Limiting (5 attempts per hour) ───────────────────────────────────────
const attempts = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (chatId: string): boolean => {
    const now = Date.now();
    const entry = attempts.get(chatId);
    if (!entry || now > entry.resetAt) {
        attempts.set(chatId, { count: 1, resetAt: now + 3600_000 });
        return true;
    }
    if (entry.count >= 5) return false;
    entry.count++;
    return true;
};

const sendMessage = async (chatId: number | string, text: string) => {
    await axios.post(`${BASE_URL}/sendMessage`, {
        chat_id:    chatId,
        text,
        parse_mode: 'Markdown',
    }).catch(err => console.error('Send message error:', err.message));
};

// Kirim notifikasi ke host saat laporan di-approve/reject oleh manager
export const notifyHostStatusUpdate = async (params: {
    host_id:    number;
    report_id:  number;
    status:     'APPROVED' | 'REJECTED';
    gmv:        number;
    duration:   number;
    platform:   string;
    notes?:     string;
}) => {
    const host = await hostRepo.findById(params.host_id);
    if (!host?.telegram_chat_id) return;

    const gmvFormatted = new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(params.gmv);

    const durasiText = `${Math.floor(params.duration / 60)}j ${params.duration % 60}m`;

    if (params.status === 'APPROVED') {
        await sendMessage(
            host.telegram_chat_id,
            `✅ *Laporan #${params.report_id} Disetujui!*\n\n` +
            `Platform : ${params.platform}\n` +
            `GMV      : ${gmvFormatted}\n` +
            `Durasi   : ${durasiText}\n` +
            (params.notes ? `\nCatatan  : ${params.notes}` : '') +
            `\n\nTerima kasih! Data Anda telah dicatat. 🎉`
        );
    } else {
        await sendMessage(
            host.telegram_chat_id,
            `❌ *Laporan #${params.report_id} Ditolak*\n\n` +
            `Platform : ${params.platform}\n` +
            `GMV      : ${gmvFormatted}\n` +
            `Durasi   : ${durasiText}\n` +
            (params.notes ? `\nAlasan   : ${params.notes}` : '') +
            `\n\nSilakan hubungi Manager untuk informasi lebih lanjut.`
        );
    }
};

const downloadPhoto = async (fileId: string): Promise<string | null> => {
    try {
        const fileRes  = await axios.get(`${BASE_URL}/getFile?file_id=${fileId}`);
        const filePath = fileRes.data.result.file_path;
        const fileUrl  = `https://api.telegram.org/file/bot${ENV.TELEGRAM_BOT_TOKEN}/${filePath}`;
        const imgRes   = await axios.get(fileUrl, { responseType: 'arraybuffer' });

        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const filename = `screenshot_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
        const savePath = path.join(uploadsDir, filename);
        fs.writeFileSync(savePath, imgRes.data);
        return filename;
    } catch (err) {
        console.error('Download photo error:', err);
        return null;
    }
};

const pendingReports = new Map<string, any>();

export const processUpdate = async (update: any) => {
    const message = update.message;
    if (!message) return;

    const chatId           = message.chat.id;
    const telegramChatId = String(message.chat.id);
    const text             = message.text?.trim();

    // /start
    if (text === '/start') {
        const host = await hostRepo.findByTelegramChatId(telegramChatId);
        if (!host) {
            await sendMessage(chatId,
                '👋 Selamat datang!\n\nAnda belum terhubung sebagai host.\n' +
                'Minta *kode registrasi* ke Manager, lalu kirim:\n`/daftar KODE`'
            );
        } else if (!host.is_active) {
            await sendMessage(chatId, '❌ Akun Anda dinonaktifkan. Hubungi Manager.');
        } else {
            await sendMessage(chatId,
                `✅ Halo *${host.full_name}*!\n\nKirimkan screenshot laporan GMV Anda.`
            );
        }
        return;
    }

    // /daftar KODE (sekali pakai)
    if (text && /^\/daftar\b/i.test(text)) {
        const match = text.match(/^\/daftar\s+(.+)$/i);
        const rawCode = match ? match[1].trim() : '';
        if (!rawCode) {
            await sendMessage(chatId,
                'Gunakan: `/daftar KODE`\n\nKode diberikan Manager setelah Anda didaftarkan.'
            );
            return;
        }

        if (!checkRateLimit(telegramChatId)) {
            await sendMessage(chatId, '⚠️ Terlalu banyak percobaan. Silakan coba lagi dalam 1 jam.');
            return;
        }

        const { status } = await hostService.activateByRegistrationCode(rawCode, telegramChatId);

        if (status === 'ok') {
            const host = await hostRepo.findByTelegramChatId(telegramChatId);
            await sendMessage(chatId,
                `✅ Berhasil! Akun *${host?.full_name ?? 'host'}* telah terhubung.\n\n` +
                `Kirimkan screenshot GMV untuk mulai laporan.`
            );
            return;
        }
        if (status === 'invalid_code') {
            await sendMessage(chatId, '❌ Kode tidak valid atau sudah dipakai.');
            return;
        }
        if (status === 'chat_already_host') {
            await sendMessage(chatId, '⚠️ Chat Telegram ini sudah terdaftar sebagai host.');
            return;
        }
        if (status === 'host_already_active') {
            await sendMessage(chatId, '⚠️ Host ini sudah diaktivasi sebelumnya.');
            return;
        }
        await sendMessage(chatId, '❌ Aktivasi gagal. Coba lagi atau hubungi Manager.');
        return;
    }

    // Konfirmasi Y/N
    if (pendingReports.has(telegramChatId)) {
        const pending  = pendingReports.get(telegramChatId);
        const response = text?.toUpperCase();

        if (response === 'Y' || response === 'YA') {
            const now = new Date();
            await reportRepo.create({
                host_id:               pending.host_id,
                platform:              pending.platform,
                reported_gmv:          pending.gmv,
                live_duration_minutes: pending.duration,
                screenshot_url:        pending.screenshotUrl,
                ocr_raw_text:          pending.rawText,
                month:                 now.getMonth() + 1,
                year:                  now.getFullYear(),
            });

            pendingReports.delete(telegramChatId);

            const gmvFormatted = new Intl.NumberFormat('id-ID', {
                style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
            }).format(pending.gmv);

            await sendMessage(chatId,
                `✅ *Laporan Tersimpan!*\n\n` +
                `Platform : ${pending.platform}\n` +
                `GMV      : ${gmvFormatted}\n` +
                `Durasi   : ${Math.floor(pending.duration / 60)}j ${pending.duration % 60}m\n\n` +
                `Status: *PENDING* — menunggu verifikasi manager.`
            );
        } else if (response === 'N' || response === 'TIDAK') {
            pendingReports.delete(telegramChatId);
            await sendMessage(chatId, '❌ Laporan dibatalkan. Kirim screenshot baru.');
        } else {
            await sendMessage(chatId, 'Ketik *Y* untuk simpan atau *N* untuk batal.');
        }
        return;
    }

    // Photo
    if (message.photo) {
        const host = await hostRepo.findByTelegramChatId(telegramChatId);

        if (!host) {
            await sendMessage(chatId,
                '❌ Akun host Anda belum diaktivasi.\n' +
                'Minta kode registrasi ke Manager lalu kirim `/daftar KODE` atau ketik /start.'
            );
            return;
        }
        if (!host.is_active) {
            await sendMessage(chatId, '❌ Akun Anda dinonaktifkan.');
            return;
        }

        await sendMessage(chatId, '⏳ Memproses screenshot...');

        const photo    = message.photo[message.photo.length - 1];
        const filename = await downloadPhoto(photo.file_id);

        if (!filename) {
            await sendMessage(chatId, '❌ Gagal mengunduh foto. Coba lagi.');
            return;
        }

        const uploadsDir = path.join(__dirname, '../uploads');
        const localPath  = path.join(uploadsDir, filename);
        const ocr = await extractFromImage(localPath);

        if (!ocr.success) {
            await sendMessage(chatId, `❌ Gagal membaca teks.\n${ocr.error}`);
            return;
        }

        const gmvFormatted = new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
        }).format(ocr.parsedGMV);

        const durasiText = ocr.parsedDurationMinutes > 0
            ? `${Math.floor(ocr.parsedDurationMinutes / 60)}j ${ocr.parsedDurationMinutes % 60}m`
            : 'Tidak terdeteksi';

        const screenshotUrl = `${ENV.BACKEND_URL}/uploads/${filename}`;

        pendingReports.set(telegramChatId, {
            host_id:      host.id,
            platform:     ocr.platform,
            gmv:          ocr.parsedGMV,
            duration:     ocr.parsedDurationMinutes,
            rawText:      ocr.rawText,
            screenshotUrl,
        });

        await sendMessage(chatId,
            `✅ *Screenshot Diproses!*\n\n` +
            `Platform : ${ocr.platform}\n` +
            `GMV      : ${gmvFormatted}\n` +
            `Durasi   : ${durasiText}\n\n` +
            `Ketik *Y* untuk simpan atau *N* untuk batal.`
        );
        return;
    }

    await sendMessage(chatId, 'Kirim *screenshot GMV*, `/daftar KODE`, atau ketik /start');
};

export const setupWebhook = async (webhookUrl: string) => {
    const res = await axios.post(`${BASE_URL}/setWebhook`, {
        url:             webhookUrl,
        allowed_updates: ['message'],
    });
    console.log('🤖 Webhook set:', res.data.ok);
};

export const deleteWebhook = async () => {
    await axios.post(`${BASE_URL}/deleteWebhook`);
    console.log('🤖 Webhook deleted (polling mode aktif)');
};

let pollingOffset = 0;
let pollingActive = false;

export const startPolling = async () => {
    if (pollingActive) return;
    pollingActive = true;

    // Hapus webhook dulu agar polling bisa berjalan
    await deleteWebhook();
    console.log('🤖 Bot polling dimulai...');

    const poll = async () => {
        if (!pollingActive) return;
        try {
            const res = await axios.get(`${BASE_URL}/getUpdates`, {
                params: {
                    offset:          pollingOffset,
                    timeout:         10,
                    allowed_updates: ['message'],
                },
                timeout: 15000,
            });

            const updates: any[] = res.data.result || [];
            for (const update of updates) {
                pollingOffset = update.update_id + 1;
                processUpdate(update).catch(console.error);
            }
        } catch (err: any) {
            if (err.code !== 'ECONNABORTED') {
                console.error('Polling error:', err.message);
            }
        }
        // Tunggu 1 detik lalu poll lagi
        setTimeout(poll, 1000);
    };

    poll();
};
