import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { ENV } from '../config/env';

export interface OcrResult {
    success: boolean;
    rawText: string;
    parsedGMV: number;
    parsedDurationMinutes: number;
    parsedPesananSKU: number;
    platform: 'TIKTOK';
    error?: string;
}

export class OCRService {

    private parseGMV(text: string): number {
        const clean = text.toUpperCase()
            .replace(/BMV|GMY|GMW/g, 'GMV')
            .replace(/\s+/g, ' ');

        const patterns = [
            /GMV\s*LANGSUNG[^0-9]*RP\s*([\d.,K]+)/i,
            /GMV[^0-9]*RP\s*([\d.,K]+)/i,
            /PENJUALAN[^0-9]*RP\s*([\d.,K]+)/i,
            /RP\s*([\d.,K]+)/i,
        ];

        for (const pattern of patterns) {
            const match = clean.match(pattern);
            if (match) {
                const raw = match[1].toUpperCase();
                let num = parseFloat(
                    raw.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')
                );
                if (raw.endsWith('K')) num *= 1000;
                if (num > 0 && num < 10_000_000_000) return num;
            }
        }
        return 0;
    }

    private parseDurationMinutes(text: string): number {
        const patterns = [
            { regex: /(\d+)\s*jam(?:\s*(\d+)\s*(?:mnt|menit)\b)?/i, type: 'jam' },
            { regex: /(\d+)\s*(?:mnt|menit)\b/i,                     type: 'menit' },
            { regex: /(\d{1,2}):(\d{2}):(\d{2})/,                    type: 'hms' },
            { regex: /durasi[:\s]+(\d+)\s*(?:mnt|menit)/i,           type: 'menit' },
        ];

        for (const p of patterns) {
            const match = text.match(p.regex);
            if (!match) continue;
            if (p.type === 'jam')   return (parseInt(match[1]) || 0) * 60 + (parseInt(match[2]) || 0);
            if (p.type === 'menit') return parseInt(match[1]);
            if (p.type === 'hms')   return parseInt(match[1]) * 60 + parseInt(match[2]);
        }
        return 0;
    }

    private parsePesananSKU(text: string): number {
        const clean = text.replace(/\s+/g, ' ');

        // Prioritas 1: Angka yang langsung SEBELUM label "Pesanan SKU"
        // Contoh: "Rp77,8K 1\nGMV Langsung Pesanan SKU"
        // OCR sering membaca sebagai: "Rp77,8K 1 GMV Langsung Pesanan SKU"
        const beforeLabel = clean.match(/(\d+)\s*(?:Pesanan\s*SKU)/i);
        if (beforeLabel) return parseInt(beforeLabel[1], 10);

        // Prioritas 2: Angka yang langsung SETELAH label "Pesanan SKU"
        const afterLabel = clean.match(/Pesanan\s*SKU\s*[^0-9]*(\d+)/i);
        if (afterLabel) return parseInt(afterLabel[1], 10);

        // Prioritas 3: Pola "SKU" dengan angka di sekitarnya
        const skuMatch = clean.match(/(\d+)\s*SKU/i);
        if (skuMatch) return parseInt(skuMatch[1], 10);

        // Prioritas 4: Angka setelah GMV (hanya jika kecil, bukan Komentar/Tayangan)
        // Kita cari pola Rp...K SPASI angka kecil (< 1000) = Pesanan SKU
        const afterGmv = clean.match(/Rp[\d.,]+K?\s+(\d{1,4})\b(?!\s*(?:K|Juta|Impresi|Tayangan|Komentar))/i);
        if (afterGmv) return parseInt(afterGmv[1], 10);

        return 0;
    }

    private detectPlatform(text: string): 'TIKTOK' {
        // Fokus hanya pada TikTok Shop (sesuai spesifikasi main branch)
        return 'TIKTOK';
    }

    async extractFromImage(imagePath: string): Promise<OcrResult> {
        try {
            const form = new FormData();
            form.append('apikey',            ENV.OCRSPACE_API_KEY);
            form.append('language',          'eng');
            form.append('isOverlayRequired', 'false');
            form.append('detectOrientation', 'true');
            form.append('scale',             'true');
            form.append('OCREngine',         '2');
            form.append('file',              fs.createReadStream(imagePath));

            const response = await axios.post('https://api.ocr.space/parse/image', form, {
                headers: form.getHeaders(),
                timeout: 45000,
            });

            if (response.data.IsErroredOnProcessing) {
                throw new Error(response.data.ErrorMessage?.[0] || 'OCR failed');
            }

            const rawText = response.data.ParsedResults?.[0]?.ParsedText || '';

            return {
                success:               true,
                rawText,
                parsedGMV:             this.parseGMV(rawText),
                parsedDurationMinutes: this.parseDurationMinutes(rawText),
                parsedPesananSKU:      this.parsePesananSKU(rawText),
                platform:              this.detectPlatform(rawText),
            };
        } catch (err: any) {
            return {
                success:               false,
                rawText:               '',
                parsedGMV:             0,
                parsedDurationMinutes: 0,
                parsedPesananSKU:      0,
                platform:              'TIKTOK',
                error:                 err.message,
            };
        }
    }
}

// Singleton — digunakan oleh TelegramBot
export const ocrService = new OCRService();

// Backward-compatible export untuk kode lama yang masih import langsung
export const extractFromImage = (imagePath: string) => ocrService.extractFromImage(imagePath);
