import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';

import { ENV } from '../config/env';
import { HostService } from '../services/HostService';
import { ReportService } from '../services/ReportService';
import { ScheduleService } from '../services/ScheduleService';
import { OCRService } from './ocrService';
import { getSlotsForTime, formatDateToYYYYMMDD, TIME_SLOTS } from '../config/scheduleConstants';

export interface NotifyStatusParams {
  host_id: number;
  report_id: number;
  status: 'APPROVED' | 'REJECTED';
  gmv: number;
  pesanan_sku: number;
  duration: number;
  live_date?: string | null;
}

function formatLiveDate(liveDateStr?: string | Date | null): string {
  if (!liveDateStr) return 'Tidak terdeteksi (Sistem: Hari Ini)';
  const d = new Date(liveDateStr);
  if (isNaN(d.getTime())) return 'Tidak terdeteksi (Sistem: Hari Ini)';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
    .format(d)
    .replace(/\./g, ':');
}

export class TelegramBot {
  private readonly BASE_URL = `https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}`;

  private _hostService?: HostService;
  private _reportService?: ReportService;
  private _ocrService?: OCRService;
  private _scheduleService?: ScheduleService;

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

  private get scheduleService() {
    if (!this._scheduleService) this._scheduleService = new ScheduleService();
    return this._scheduleService;
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

  public async sendMessage(chatId: number | string, text: string): Promise<void> {
    await axios
      .post(`${this.BASE_URL}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      })
      .catch((err) => console.error('Send message error:', err.message));
  }

  /**
   * Mengunduh foto dari Telegram lalu mengunggahnya ke Cloudinary.
   * Mengembalikan URL publik gambar.
   */
  private async uploadPhotoToCloud(fileId: string): Promise<string> {
    const fileRes = await axios.get(`${this.BASE_URL}/getFile?file_id=${fileId}`);
    const filePath = fileRes.data.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${ENV.TELEGRAM_BOT_TOKEN}/${filePath}`;
    
    const imgRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imgRes.data);

    // Konfigurasi eksplisit Cloudinary (berjaga-jaga jika process.env telat terbaca)
    cloudinary.config({
      url: ENV.CLOUDINARY_URL
    });

    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'kepswell_reports' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(error);
          }
          resolve(result!.secure_url);
        }
      );
      uploadStream.end(buffer);
    });
  }

  async notifyHostStatusUpdate(params: NotifyStatusParams): Promise<void> {
    const host = await this.hostService.findHostById(params.host_id);
    if (!host?.telegram_chat_id) return;

    const gmvFormatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(params.gmv);

    const durasiText = `${Math.floor(params.duration / 60)}j ${params.duration % 60}m`;
    const liveDateText = formatLiveDate(params.live_date);

    if (params.status === 'APPROVED') {
      await this.sendMessage(
        host.telegram_chat_id,
        `✅ *Laporan #${params.report_id} Disetujui!*\n\n` +
        `GMV      : ${gmvFormatted}\n` +
        `Pesanan  : ${params.pesanan_sku} SKU\n` +
        `Durasi   : ${durasiText}\n` +
        `Waktu    : ${liveDateText}\n` +
        `\n\nTerima kasih! Data Anda telah dicatat. 🎉`,
      );
    } else {
      await this.sendMessage(
        host.telegram_chat_id,
        `❌ *Laporan #${params.report_id} Ditolak*\n\n` +
        `GMV      : ${gmvFormatted}\n` +
        `Pesanan  : ${params.pesanan_sku} SKU\n` +
        `Durasi   : ${durasiText}\n` +
        `Waktu    : ${liveDateText}\n` +
        `\n\nSilakan hubungi Manager untuk informasi lebih lanjut.`,
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
        await this.sendMessage(
          chatId,
          '👋 Selamat datang!\n\nAnda belum terhubung sebagai host.\n' +
          'Minta *kode registrasi* ke Manager, lalu kirim:\n`/daftar KODE`',
        );
      } else if (!host.is_active) {
        await this.sendMessage(chatId, '❌ Akun Anda dinonaktifkan. Hubungi Manager.');
      } else {
        await this.sendMessage(
          chatId,
          `✅ Halo *${host.full_name}*!\n\nKirimkan screenshot laporan GMV Anda.`,
        );
      }
      return;
    }

    if (text && /^\/daftar\b/i.test(text)) {
      await this.handleDaftarCommand(chatId, telegramChatId, text);
      return;
    }

    if (text === '/jadwal') {
      await this.handleJadwalCommand(chatId, telegramChatId);
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
      let targetMonth = now.getMonth() + 1;
      let targetYear = now.getFullYear();

      if (pending.liveDate) {
        const liveDateObj = new Date(pending.liveDate);
        if (!isNaN(liveDateObj.getTime())) {
          const endDateObj = new Date(liveDateObj.getTime() + (pending.duration || 0) * 60000);
          targetMonth = endDateObj.getMonth() + 1;
          targetYear = endDateObj.getFullYear();
        }
      }

      await this.reportService.recordNewReport({
        host_id: pending.host_id,
        reported_gmv: pending.gmv,
        reported_pesanan_sku: pending.pesanan_sku,
        live_duration_minutes: pending.duration,
        screenshot_url: pending.screenshotUrl,
        ocr_raw_text: pending.rawText,
        live_date: pending.liveDate || null,
        month: targetMonth,
        year: targetYear,
        schedule_status: pending.scheduleStatus || null,
      });

      this.pendingReports.delete(telegramChatId);

      const gmvFormatted = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(pending.gmv);

      const liveDateText = formatLiveDate(pending.liveDate);

      await this.sendMessage(
        chatId,
        `✅ *Laporan Tersimpan!*\n\n` +
        `GMV      : ${gmvFormatted}\n` +
        `Pesanan  : ${pending.pesanan_sku} SKU\n` +
        `Durasi   : ${Math.floor(pending.duration / 60)}j ${pending.duration % 60}m\n` +
        `Waktu    : ${liveDateText}\n\n` +
        `Status: *PENDING* — menunggu verifikasi manager.`,
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
      await this.sendMessage(
        chatId,
        '❌ Akun host Anda belum diaktivasi.\n' +
        'Minta kode registrasi ke Manager lalu kirim `/daftar KODE` atau ketik /start.',
      );
      return;
    }
    if (!host.is_active) {
      await this.sendMessage(chatId, '❌ Akun Anda dinonaktifkan.');
      return;
    }

    await this.sendMessage(chatId, '⏳ Memproses screenshot...');

    const photo = photoArray[photoArray.length - 1];

    let publicUrl: string;
    try {
      publicUrl = await this.uploadPhotoToCloud(photo.file_id);
    } catch (err) {
      await this.sendMessage(chatId, '❌ Gagal mengunggah foto ke Cloud. Coba lagi.');
      return;
    }

    const ocr = await this.ocrService.extractFromImageUrl(publicUrl);

    if (!ocr.success) {
      await this.sendMessage(chatId, `❌ Gagal membaca teks.\n${ocr.error}`);
      return;
    }

    let isAnomaly = false;
    let anomalyReason = '';

    if (ocr.parsedGMV > 0 && ocr.parsedDurationMinutes === 0) {
      isAnomaly = true;
      anomalyReason = 'GMV > 0 tapi durasi 0';
    } else if (ocr.parsedGMV > 0 && ocr.parsedPesananSKU === 0) {
      isAnomaly = true;
      anomalyReason = 'GMV > 0 tapi pesanan (SKU) 0';
    } else if (ocr.parsedPesananSKU > 0 && ocr.parsedGMV === 0) {
      isAnomaly = true;
      anomalyReason = 'Ada pesanan (SKU > 0) tapi GMV 0';
    } else if (ocr.parsedPesananSKU > 0 && ocr.parsedDurationMinutes === 0) {
      isAnomaly = true;
      anomalyReason = 'Ada pesanan (SKU > 0) tapi durasi 0';
    }

    if (isAnomaly) {
      const gmvFmt = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(ocr.parsedGMV);
      const durFmt =
        ocr.parsedDurationMinutes > 0
          ? `${Math.floor(ocr.parsedDurationMinutes / 60)}j ${ocr.parsedDurationMinutes % 60}m`
          : '0j 0m';
      const dateFmt = formatLiveDate(ocr.parsedLiveDate);

      await this.sendMessage(
        chatId,
        `⚠️ *Laporan Ditolak*\nTerdeteksi anomali pada data: *${anomalyReason}*\n\n` +
        `*Data yang terbaca oleh sistem:*\n` +
        `GMV      : ${gmvFmt}\n` +
        `Pesanan  : ${ocr.parsedPesananSKU} SKU\n` +
        `Durasi   : ${durFmt}\n` +
        `Waktu    : ${dateFmt}\n\n` +
        `Pastikan screenshot yang Anda kirim adalah laporan yang benar dan jelas.`,
      );
      return;
    }

    // --- SCHEDULE VALIDATION ---
    // Estimasi waktu mulai live
    let liveStartTime: Date;
    if (ocr.parsedLiveDate) {
      liveStartTime = new Date(ocr.parsedLiveDate);
    } else {
      // Fallback: waktu sekarang - durasi live = perkiraan waktu MULAI
      liveStartTime = new Date(Date.now() - (ocr.parsedDurationMinutes || 0) * 60000);
    }

    // Validasi jadwal (cek SEMUA slot yang overlap dengan toleransi)
    const scheduleCheck = await this.scheduleService.validateHostForSlot(
      host.id, liveStartTime
    );

    if (!scheduleCheck.valid) {
      await this.sendMessage(chatId,
        `⚠️ *Laporan Ditolak*\n` +
        `Anda tidak terjadwal live pada waktu ini.\n` +
        `(Waktu mulai live terdeteksi: ${formatLiveDate(liveStartTime)})\n\n` +
        `Jadwal pada tanggal ${scheduleCheck.dateLabel}:\n` +
        `${scheduleCheck.slotLabel}\n\n` +
        `Silakan hubungi Manager jika ada perubahan jadwal.`
      );
      return;
    }
    // ---------------------------

    const gmvFormatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(ocr.parsedGMV);

    const durasiText =
      ocr.parsedDurationMinutes > 0
        ? `${Math.floor(ocr.parsedDurationMinutes / 60)}j ${ocr.parsedDurationMinutes % 60}m`
        : 'Tidak terdeteksi';

    const isDuplicate = await this.reportService.checkDuplicate(
      host.id,
      ocr.parsedGMV,
      ocr.parsedPesananSKU,
      ocr.parsedDurationMinutes,
      ocr.parsedLiveDate || null,
    );

    if (isDuplicate) {
      await this.sendMessage(
        chatId,
        `⚠️ *Laporan Ditolak*\nLaporan ini terdeteksi sebagai DUPLIKAT (sudah pernah dikirimkan sebelumnya).`,
      );
      return;
    }

    const screenshotUrl = publicUrl;

    this.pendingReports.set(telegramChatId, {
      host_id: host.id,
      gmv: ocr.parsedGMV,
      pesanan_sku: ocr.parsedPesananSKU,
      duration: ocr.parsedDurationMinutes,
      rawText: ocr.rawText,
      liveDate: ocr.parsedLiveDate,
      screenshotUrl,
      scheduleStatus: scheduleCheck.status, // MATCH or NO_SCHEDULE
    });

    const liveDateText = formatLiveDate(ocr.parsedLiveDate);

    await this.sendMessage(
      chatId,
      `✅ *Screenshot Diproses!*\n\n` +
      `GMV      : ${gmvFormatted}\n` +
      `Pesanan  : ${ocr.parsedPesananSKU} SKU\n` +
      `Durasi   : ${durasiText}\n` +
      `Waktu    : ${liveDateText}\n\n` +
      `Ketik *Y* untuk simpan atau *N* untuk batal.`,
    );
  }

  private async handleDaftarCommand(chatId: string, telegramChatId: string, text: string) {
    const match = text.match(/^\/daftar\s+(.+)$/i);
    const rawCode = match ? match[1].trim() : '';
    if (!rawCode) {
      await this.sendMessage(
        chatId,
        'Gunakan: `/daftar KODE`\n\nKode diberikan Manager setelah Anda didaftarkan.',
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
      await this.sendMessage(
        chatId,
        `✅ Berhasil! Akun *${host?.full_name ?? 'host'}* telah terhubung.\n\n` +
        `Kirimkan screenshot GMV untuk mulai laporan.`,
      );
      return;
    }
    const errorMessages: Record<string, string> = {
      invalid_code: '❌ Kode tidak valid atau sudah dipakai.',
      chat_already_host: '⚠️ Chat Telegram ini sudah terdaftar sebagai host.',
      host_already_active: '⚠️ Host ini sudah diaktivasi sebelumnya.',
    };

    if (errorMessages[status]) {
      await this.sendMessage(chatId, errorMessages[status]);
      return;
    }
  }

  private async handleJadwalCommand(chatId: string, telegramChatId: string) {
    const host = await this.hostService.getHostByTelegramId(telegramChatId);
    if (!host) {
      await this.sendMessage(chatId, '❌ Anda belum terdaftar sebagai host.');
      return;
    }

    try {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const weekStartStr = formatDateToYYYYMMDD(monday);
      const weekEndStr = formatDateToYYYYMMDD(sunday);

      const schedules = await this.scheduleService.getWeekSchedule(weekStartStr);
      
      const hostSchedules = schedules.filter(s => s.host_id === host.id);
      
      let msg = `📅 *Jadwal Live Anda Minggu Ini*\n(${weekStartStr} s.d. ${weekEndStr})\n\n`;
      
      const scheduleByDate = new Map<string, number[]>();
      hostSchedules.forEach(s => {
        const dStr = typeof s.schedule_date === 'string' ? s.schedule_date : formatDateToYYYYMMDD(s.schedule_date as Date);
        if (!scheduleByDate.has(dStr)) scheduleByDate.set(dStr, []);
        scheduleByDate.get(dStr)!.push(s.slot_index);
      });

      for (let i = 0; i < 7; i++) {
        const curDate = new Date(monday);
        curDate.setDate(monday.getDate() + i);
        const curDateStr = formatDateToYYYYMMDD(curDate);
        const dayName = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'][i];
        
        msg += `• *${dayName}*: `;
        const slots = scheduleByDate.get(curDateStr);
        if (slots && slots.length > 0) {
          slots.sort();
          msg += slots.map(s => TIME_SLOTS[s].label.split(' ')[1].replace(/[()]/g, '')).join(', ');
        } else {
          msg += '—';
        }
        msg += '\n';
      }

      await this.sendMessage(chatId, msg);
    } catch (e) {
      console.error(e);
      await this.sendMessage(chatId, '❌ Gagal mengambil jadwal.');
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
export const notifyHostStatusUpdate = (params: NotifyStatusParams) =>
  telegramBot.notifyHostStatusUpdate(params);
export const setupWebhook = (url: string) => telegramBot.setupWebhook(url);
export const sendMessage = (chatId: string | number, text: string) => telegramBot.sendMessage(chatId, text);

