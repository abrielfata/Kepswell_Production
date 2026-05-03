import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env';
import { HostRepository } from '../repositories/HostRepository';
import { ReportRepository } from '../repositories/ReportRepository';
import { extractFromImage } from './ocrService';

const hostRepo   = new HostRepository();
const reportRepo = new ReportRepository();
const BASE_URL   = `https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}`;

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
    if (!host?.telegram_user_id) return; // host belum binding telegram, skip

    const gmvFormatted = new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(params.gmv);

    const durasiText = `${Math.floor(params.duration / 60)}j ${params.duration % 60}m`;

    if (params.status === 'APPROVED') {
        await sendMessage(
            host.telegram_user_id,
            `✅ *Laporan #${params.report_id} Disetujui!*\n\n` +
            `Platform : ${params.platform}\n` +
            `GMV      : ${gmvFormatted}\n` +
            `Durasi   : ${durasiText}\n` +
            (params.notes ? `\nCatatan  : ${params.notes}` : '') +
            `\n\nTerima kasih! Data Anda telah dicatat. 🎉`
        );
    } else {
        await sendMessage(
            host.telegram_user_id,
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

        const tempDir  = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const savePath = path.join(tempDir, `photo_${Date.now()}.jpg`);
        fs.writeFileSync(savePath, imgRes.data);
        return savePath;
    } catch {
        return null;
    }
};

const pendingReports = new Map<string, any>();

export const processUpdate = async (update: any) => {
    const message = update.message;
    if (!message) return;

    const chatId         = message.chat.id;
    const telegramUserId = String(message.from.id);
    const text           = message.text?.trim();

    // /start
    if (text === '/start') {
        const host = await hostRepo.findByTelegramId(telegramUserId);
        if (!host) {
            await sendMessage(chatId,
                '👋 Selamat datang!\n\nAkun Anda belum terdaftar.\n' +
                'Minta *binding token* ke Manager dan kirim:\n`/bind TOKEN`'
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

    // /bind TOKEN
    if (text?.startsWith('/bind ')) {
        const token = text.replace('/bind ', '').trim();
        const host  = await hostRepo.findByBindingToken(token);

        if (!host) {
            await sendMessage(chatId, '❌ Token tidak valid atau sudah digunakan.');
            return;
        }

        const alreadyBound = await hostRepo.findByTelegramId(telegramUserId);
        if (alreadyBound) {
            await sendMessage(chatId, '⚠️ Akun Telegram ini sudah terikat ke host lain.');
            return;
        }

        await hostRepo.update(host.id, {
            telegram_user_id: telegramUserId,
            binding_token:    null,
        });

        await sendMessage(chatId,
            `✅ Berhasil! Akun *${host.full_name}* telah terhubung.\n\n` +
            `Kirimkan screenshot GMV untuk mulai laporan.`
        );
        return;
    }

    // Konfirmasi Y/N
    if (pendingReports.has(telegramUserId)) {
        const pending  = pendingReports.get(telegramUserId);
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

            pendingReports.delete(telegramUserId);

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
            pendingReports.delete(telegramUserId);
            await sendMessage(chatId, '❌ Laporan dibatalkan. Kirim screenshot baru.');
        } else {
            await sendMessage(chatId, 'Ketik *Y* untuk simpan atau *N* untuk batal.');
        }
        return;
    }

    // Photo
    if (message.photo) {
        const host = await hostRepo.findByTelegramId(telegramUserId);

        if (!host) {
            await sendMessage(chatId, '❌ Akun belum terdaftar. Ketik /start');
            return;
        }
        if (!host.is_active) {
            await sendMessage(chatId, '❌ Akun Anda dinonaktifkan.');
            return;
        }

        await sendMessage(chatId, '⏳ Memproses screenshot...');

        const photo    = message.photo[message.photo.length - 1];
        const savePath = await downloadPhoto(photo.file_id);

        if (!savePath) {
            await sendMessage(chatId, '❌ Gagal mengunduh foto. Coba lagi.');
            return;
        }

        const ocr = await extractFromImage(savePath);
        if (fs.existsSync(savePath)) fs.unlinkSync(savePath);

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

        const screenshotUrl = `https://api.telegram.org/file/bot${ENV.TELEGRAM_BOT_TOKEN}/${photo.file_id}`;

        pendingReports.set(telegramUserId, {
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

    await sendMessage(chatId, 'Kirimkan *screenshot GMV* atau ketik /start');
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

export const stopPolling = () => {
    pollingActive = false;
    console.log('🤖 Bot polling dihentikan');
};
