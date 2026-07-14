import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ENV } from '../config/env';
import { HostService } from '../services/HostService';
import { ReportService } from '../services/ReportService';
import { OCRService } from './ocrService';



export interface NotifyStatusParams {
    host_id: number;
    report_id: number;
    status: 'APPROVED' | 'REJECTED';
    gmv: number;
    pesanan_sku: number;
    duration: number;
}



export class TelegramBot {
    private readonly BASE_URL = `https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}`;

    private _hostService?: HostService;
    private _reportService?: ReportService;
    private _ocrService?: OCRService;

    private get hostService() {
        if (!this._hostService) this._hostService = new HostService();
        return this._hostService;
    }

    private get reportService() {
        if (!this._reportService) this._reportService = new ReportService();
        return this._reportService;
    }

    private get ocrService() {
        if (!this._ocrService) this._ocrService = new OCRService();
        return this._ocrService;
    }

    private readonly pendingReports = new Map<string, any>();
    private readonly attempts = new Map<string, { count: number; resetAt: number }>();



    private isRateLimited(chatId: string): boolean {
        const now = Date.now();
        const entry = this.attempts.get(chatId);
        if (!entry || now > entry.resetAt) {
            this.attempts.set(chatId, { count: 1, resetAt: now + 3_600_000 });
            return false;
        }
        if (entry.count >= 5) return true;
        entry.count++;
        return false;
    }

    private async sendMessage(chatId: number | string, text: string): Promise<void> {
        await axios.post(`${this.BASE_URL}/sendMessage`, {
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
        }).catch(err => console.error('Send message error:', err.message));
    }

    /**
     * Mengunduh foto dari Telegram dan menyimpan ke lokal.
     * Melempar Error jika unduhan gagal (fail-fast — tidak return null).
     */
    private async downloadPhoto(fileId: string): Promise<string> {
        const fileRes = await axios.get(`${this.BASE_URL}/getFile?file_id=${fileId}`);
        const filePath = fileRes.data.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${ENV.TELEGRAM_BOT_TOKEN}/${filePath}`;
        const imgRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });

        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const filename = `screenshot_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
        const savePath = path.join(uploadsDir, filename);
        fs.writeFileSync(savePath, imgRes.data);
        return filename;
    }



    async notifyHostStatusUpdate(params: NotifyStatusParams): Promise<void> {
        const host = await this.hostService.findHostById(params.host_id);
        if (!host?.telegram_chat_id) return;

        const gmvFormatted = new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
        }).format(params.gmv);

        const durasiText = `${Math.floor(params.duration / 60)}j ${params.duration % 60}m`;

        if (params.status === 'APPROVED') {
            await this.sendMessage(
                host.telegram_chat_id,
                `✅ *Laporan #${params.report_id} Disetujui!*\n\n` +
                `GMV      : ${gmvFormatted}\n` +
                `Pesanan  : ${params.pesanan_sku} SKU\n` +
                `Durasi   : ${durasiText}\n` +
                `\n\nTerima kasih! Data Anda telah dicatat. 🎉`
            );
        } else {
            await this.sendMessage(
                host.telegram_chat_id,
                `❌ *Laporan #${params.report_id} Ditolak*\n\n` +
                `GMV      : ${gmvFormatted}\n` +
                `Pesanan  : ${params.pesanan_sku} SKU\n` +
                `Durasi   : ${durasiText}\n` +
                `\n\nSilakan hubungi Manager untuk informasi lebih lanjut.`
            );
        }
    }

    async processUpdate(update: any): Promise<void> {
        const message = update.message;
        if (!message) return;

        const chatId = message.chat.id;
        const telegramChatId = String(message.chat.id);
        const text = message.text?.trim();


        if (text === '/start') {
            const host = await this.hostService.getHostByTelegramId(telegramChatId);
            if (!host) {
                await this.sendMessage(chatId,
                    '👋 Selamat datang!\n\nAnda belum terhubung sebagai host.\n' +
                    'Minta *kode registrasi* ke Manager, lalu kirim:\n`/daftar KODE`'
                );
            } else if (!host.is_active) {
                await this.sendMessage(chatId, '❌ Akun Anda dinonaktifkan. Hubungi Manager.');
            } else {
                await this.sendMessage(chatId,
                    `✅ Halo *${host.full_name}*!\n\nKirimkan screenshot laporan GMV Anda.`
                );
            }
            return;
        }


        if (text && /^\/daftar\b/i.test(text)) {
            await this.handleDaftarCommand(chatId, telegramChatId, text);
            return;
        }


        if (this.pendingReports.has(telegramChatId)) {
            await this.handleReply(chatId, telegramChatId, text);
            return;
        }


        if (message.photo) {
            await this.handlePhoto(chatId, telegramChatId, message.photo);
            return;
        }

        await this.sendMessage(chatId, 'Kirim *screenshot GMV*, `/daftar KODE`, atau ketik /start');
    }



    private async handleReply(chatId: string, telegramChatId: string, text: string) {
        const pending = this.pendingReports.get(telegramChatId);
        const response = text?.toUpperCase();

        if (response === 'Y' || response === 'YA') {
            const now = new Date();
            await this.reportService.recordNewReport({
                host_id: pending.host_id,
                reported_gmv: pending.gmv,
                reported_pesanan_sku: pending.pesanan_sku,
                live_duration_minutes: pending.duration,
                screenshot_url: pending.screenshotUrl,
                ocr_raw_text: pending.rawText,
                live_date: pending.liveDate || null,
                month: now.getMonth() + 1,
                year: now.getFullYear(),
            });

            this.pendingReports.delete(telegramChatId);

            const gmvFormatted = new Intl.NumberFormat('id-ID', {
                style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
            }).format(pending.gmv);

            await this.sendMessage(chatId,
                `✅ *Laporan Tersimpan!*\n\n` +
                `GMV      : ${gmvFormatted}\n` +
                `Pesanan  : ${pending.pesanan_sku} SKU\n` +
                `Durasi   : ${Math.floor(pending.duration / 60)}j ${pending.duration % 60}m\n\n` +
                `Status: *PENDING* — menunggu verifikasi manager.`
            );
        } else if (response === 'N' || response === 'TIDAK') {
            this.pendingReports.delete(telegramChatId);
            await this.sendMessage(chatId, '❌ Laporan dibatalkan. Kirim screenshot baru.');
        } else {
            await this.sendMessage(chatId, 'Ketik *Y* untuk simpan atau *N* untuk batal.');
        }
    }

    private async handlePhoto(chatId: string, telegramChatId: string, photoArray: any[]) {
        const host = await this.hostService.getHostByTelegramId(telegramChatId);

        if (!host) {
            await this.sendMessage(chatId,
                '❌ Akun host Anda belum diaktivasi.\n' +
                'Minta kode registrasi ke Manager lalu kirim `/daftar KODE` atau ketik /start.'
            );
            return;
        }
        if (!host.is_active) {
            await this.sendMessage(chatId, '❌ Akun Anda dinonaktifkan.');
            return;
        }

        await this.sendMessage(chatId, '⏳ Memproses screenshot...');

        const photo = photoArray[photoArray.length - 1];

        let filename: string;
        try {
            filename = await this.downloadPhoto(photo.file_id);
        } catch (err) {
            await this.sendMessage(chatId, '❌ Gagal mengunduh foto. Coba lagi.');
            return;
        }

        const uploadsDir = path.join(__dirname, '../uploads');
        const localPath = path.join(uploadsDir, filename);
        const ocr = await this.ocrService.extractFromImage(localPath);

        if (!ocr.success) {
            await this.sendMessage(chatId, `❌ Gagal membaca teks.\n${ocr.error}`);
            return;
        }

        const gmvFormatted = new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
        }).format(ocr.parsedGMV);

        const durasiText = ocr.parsedDurationMinutes > 0
            ? `${Math.floor(ocr.parsedDurationMinutes / 60)}j ${ocr.parsedDurationMinutes % 60}m`
            : 'Tidak terdeteksi';

        const isDuplicate = await this.reportService.checkDuplicate(
            host.id,
            ocr.parsedGMV,
            ocr.parsedPesananSKU,
            ocr.parsedDurationMinutes,
            ocr.parsedLiveDate || null
        );

        if (isDuplicate) {
            await this.sendMessage(chatId, `⚠️ *Laporan Ditolak*\nLaporan ini terdeteksi sebagai DUPLIKAT (sudah pernah dikirimkan sebelumnya).`);
            return;
        }

        const screenshotUrl = `${ENV.BACKEND_URL}/uploads/${filename}`;

        this.pendingReports.set(telegramChatId, {
            host_id: host.id,
            gmv: ocr.parsedGMV,
            pesanan_sku: ocr.parsedPesananSKU,
            duration: ocr.parsedDurationMinutes,
            rawText: ocr.rawText,
            liveDate: ocr.parsedLiveDate,
            screenshotUrl,
        });

        await this.sendMessage(chatId,
            `✅ *Screenshot Diproses!*\n\n` +
            `GMV      : ${gmvFormatted}\n` +
            `Pesanan  : ${ocr.parsedPesananSKU} SKU\n` +
            `Durasi   : ${durasiText}\n\n` +
            `Ketik *Y* untuk simpan atau *N* untuk batal.`
        );
    }

    private async handleDaftarCommand(chatId: string, telegramChatId: string, text: string) {
        const match = text.match(/^\/daftar\s+(.+)$/i);
        const rawCode = match ? match[1].trim() : '';
        if (!rawCode) {
            await this.sendMessage(chatId,
                'Gunakan: `/daftar KODE`\n\nKode diberikan Manager setelah Anda didaftarkan.'
            );
            return;
        }

        if (this.isRateLimited(telegramChatId)) {
            await this.sendMessage(chatId, '⚠️ Terlalu banyak percobaan. Silakan coba lagi dalam 1 jam.');
            return;
        }

        const { status } = await this.hostService.linkTelegramAccount(rawCode, telegramChatId);

        if (status === 'ok') {
            const host = await this.hostService.getHostByTelegramId(telegramChatId);
            await this.sendMessage(chatId,
                `✅ Berhasil! Akun *${host?.full_name ?? 'host'}* telah terhubung.\n\n` +
                `Kirimkan screenshot GMV untuk mulai laporan.`
            );
            return;
        }
        const errorMessages: Record<string, string> = {
            'invalid_code': '❌ Kode tidak valid atau sudah dipakai.',
            'chat_already_host': '⚠️ Chat Telegram ini sudah terdaftar sebagai host.',
            'host_already_active': '⚠️ Host ini sudah diaktivasi sebelumnya.'
        };

        if (errorMessages[status]) {
            await this.sendMessage(chatId, errorMessages[status]);
            return;
        }
    }

    async setupWebhook(webhookUrl: string): Promise<void> {
        const res = await axios.post(`${this.BASE_URL}/setWebhook`, {
            url: webhookUrl,
            allowed_updates: ['message'],
        });
        console.log('🤖 Webhook set:', res.data.ok);
    }

}

export const telegramBot = new TelegramBot();

export const processUpdate = (update: any) => telegramBot.processUpdate(update);
export const notifyHostStatusUpdate = (params: NotifyStatusParams) => telegramBot.notifyHostStatusUpdate(params);
export const setupWebhook = (url: string) => telegramBot.setupWebhook(url);
