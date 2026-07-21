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
    parsedLiveDate?: string | null;
    error?: string;
}

export class OCRService {

    private parseGMV(text: string): number {
        const clean = text.toUpperCase()
            .replace(/BMV|GMY|GMW/g, 'GMV')
            .replace(/\s+/g, ' ');

        const patterns = [
            /PEROLEHAN\s*GMV\s*\(RP\).*?#\s*([\d.,]+)/i,
            /PEROLEHAN\s*GMV\s*\(RP\)[^\d]*([\d.,]+)/i,
            /GMV\s*LANGSUNG[^0-9]*RP\s*([\d.,K]+)/i,
            /GMV[^0-9]*RP\s*([\d.,K]+)/i,
            /PENJUALAN[^0-9]*RP\s*([\d.,K]+)/i,
            /RP\s*([\d.,K]+)/i,
        ];

        for (const pattern of patterns) {
            const match = clean.match(pattern);
            if (match) {
                const raw = match[1].toUpperCase();
                let num = 0;
                if (raw.endsWith('K')) {
                    const cleanStr = raw.replace('K', '').replace(',', '.');
                    num = parseFloat(cleanStr) * 1000;
                } else {
                    const cleanStr = raw.replace(/[.,]/g, '');
                    num = parseInt(cleanStr, 10);
                }
                if (num > 0 && num < 10_000_000_000) return num;
            }
        }
        return 0;
    }

    private parseDurationMinutes(text: string): number {
        const patterns = [
            // Handle 'j', 'jam', 'h', 'hrs' and OCR misreads like ')', ']', 'l', 'i'
            { regex: /(\d+)\s*(?:jam\b|j\b|h\b|hrs\b|\)|\]|l\b|i\b)(?:[,|\s]*(\d+)\s*(?:mnt|menit|m\b|min\b))?/i, type: 'jam' },
            { regex: /(\d+)\s*(?:mnt|menit|m\b|min\b)/i,                     type: 'menit' },
            { regex: /(\d{1,2}):(\d{2}):(\d{2})/,                    type: 'hms' },
            { regex: /durasi[:\s]+(\d+)\s*(?:mnt|menit|m\b|min\b)/i,           type: 'menit' },
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
        const clean = text.replace(/\s+/g, ' ').trim();

        // Format Baru: Produk terjual di LIVE 3
        // Diperluas agar bisa menangkap "terjual di LIVE18" (tanpa spasi), atau "terjual di LVE 18"
        const terjualMatch = clean.match(/terjual\s*di\s*[a-z]*\s*(\d+)/i);
        if (terjualMatch) return parseInt(terjualMatch[1], 10);

        // Prioritas 1: GMV dengan suffix K diikuti LANGSUNG angka (dengan/tanpa spasi)
        // Menangani: "Rp163K 2 ..." dan "Rp163K2 ..." (OCR merges)
        // \s* = nol atau lebih spasi → lebih toleran dari \s+
        const afterGmvK = clean.match(/Rp[\d.,]+K\s*(\d{1,4})\b/i);
        if (afterGmvK) return parseInt(afterGmvK[1], 10);

        // Prioritas 2: GMV tanpa suffix K, diikuti angka, dan "Pesanan SK" ada dalam 60 karakter berikut
        // Menangani: "Rp500 2 GMV Langsung Pesanan SKU ..."
        const afterGmvNoK = clean.match(/Rp[\d.,]+\s+(\d{1,4})\b(?=.{0,60}Pesanan\s+SK)/i);
        if (afterGmvNoK) return parseInt(afterGmvNoK[1], 10);

        // Prioritas 3: Angka yang langsung SEBELUM label "Pesanan SK..." (OCR per-kolom / SKIJ dll)
        // Menangani: "2 Pesanan SKU" atau "2 Pesanan SKIJ"
        const beforeLabel = clean.match(/\b(\d{1,4})\s+Pesanan\s+SK[A-Z]*/i);
        if (beforeLabel) return parseInt(beforeLabel[1], 10);

        // Prioritas 4: Angka setelah label "Pesanan SK" (hanya boleh dipisah spasi/tanda baca)
        const afterLabel = clean.match(/Pesanan\s+SK[A-Z]*\s*[:\-]?\s*(\d{1,4})\b/i);
        if (afterLabel) return parseInt(afterLabel[1], 10);

        return 0;
    }

    private parseLiveDate(text: string): string | null {
        // Fix OCR mistakes in time formats specifically (e.g., O7.10.14 or l0.0I.38)
        const sanitizedText = text.replace(/(?:\b|(?<=\s))([0-9OoIilZzSs]{1,2})\s*[:.,]\s*([0-9OoIilZzSs]{2})(?:\s*[:.,]\s*([0-9OoIilZzSs]{2}))?(?=\b|\s)/g, (match) => {
            return match
                .replace(/[OoQ]/g, '0')
                .replace(/[Iil|]/g, '1')
                .replace(/[Zz]/g, '2')
                .replace(/[Ss]/g, '5');
        });

        const now = new Date();

        // 1. Tanggal dengan Hari Ini / Kemarin (relatif)
        const relativeMatch = sanitizedText.match(/(Hari\s*ini|Kemarin|Today|Yesterday)(?:[\s,]*(\d{1,2})[:.](\d{2}))?/i);
        if (relativeMatch) {
            const relText = relativeMatch[1].toLowerCase();
            const hourStr = relativeMatch[2];
            const minuteStr = relativeMatch[3];
            
            const targetDate = new Date(now);
            if (relText.includes('kemarin') || relText.includes('yesterday')) {
                targetDate.setDate(now.getDate() - 1);
            }
            
            let timeStr = '00:00:00';
            if (hourStr && minuteStr) {
                timeStr = `${String(parseInt(hourStr, 10)).padStart(2, '0')}:${String(parseInt(minuteStr, 10)).padStart(2, '0')}:00`;
            }
            return `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')} ${timeStr}+07:00`;
        }

        // 1.5 Format TikTok spesifik: "10 Jul, 10.00.35 - 10 Jul, 12.00.32"
        const tiktokRangeMatch = sanitizedText.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Mei|Jun|Jul|Aug|Ags|Agu|Sep|Oct|Okt|Nov|Dec|Des)[a-z]*[\s.,\-]+(\d{1,2})\s*[:.,]*\s*(\d{2})(?:\s*[:.,]*\s*(\d{2}))?\s*[-~_]+\s*/i);
        if (tiktokRangeMatch) {
            const day = parseInt(tiktokRangeMatch[1], 10);
            const monthStr = tiktokRangeMatch[2].toLowerCase();
            const hourStr = tiktokRangeMatch[3];
            const minuteStr = tiktokRangeMatch[4];
            
            const months: Record<string, number> = {
                'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'mei': 5, 'jun': 6,
                'jul': 7, 'aug': 8, 'ags': 8, 'agu': 8, 'sep': 9, 'oct': 10, 'okt': 10, 'nov': 11, 'dec': 12, 'des': 12
            };
            const month = months[monthStr];
            if (month) {
                let year = now.getFullYear();
                if (month > now.getMonth() + 1) year -= 1;
                const timeStr = `${String(parseInt(hourStr, 10)).padStart(2, '0')}:${String(parseInt(minuteStr, 10)).padStart(2, '0')}:00`;
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${timeStr}+07:00`;
            }
        }

        // 2. Format numerik DD/MM/YYYY atau DD-MM-YYYY (contoh: 12/07/2024 18:30)
        const numericMatch = sanitizedText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[\s.,\-]*(\d{1,2})\s*[:.,]*\s*(\d{2}))?/);
        if (numericMatch) {
            const day = parseInt(numericMatch[1], 10);
            const month = parseInt(numericMatch[2], 10);
            let year = parseInt(numericMatch[3], 10);
            if (year < 100) year += 2000;
            
            let timeStr = '00:00:00';
            if (numericMatch[4] && numericMatch[5]) {
                timeStr = `${String(parseInt(numericMatch[4], 10)).padStart(2, '0')}:${String(parseInt(numericMatch[5], 10)).padStart(2, '0')}:00`;
            }
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${timeStr}+07:00`;
            }
        }

        // 3. Format Teks seperti "12 Jul", "12 Agustus 18:30" (Dukungan Bulan Indonesia & Inggris)
        const textMatch = sanitizedText.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Mei|Jun|Jul|Aug|Ags|Agu|Sep|Oct|Okt|Nov|Dec|Des)[a-z]*(?:[\s.,\-]*(\d{1,2})\s*[:.,]*\s*(\d{2}))?/i);
        if (textMatch) {
            const day = parseInt(textMatch[1], 10);
            const monthStr = textMatch[2].toLowerCase();
            const hourStr = textMatch[3];
            const minuteStr = textMatch[4];

            const months: Record<string, number> = {
                'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'mei': 5, 'jun': 6,
                'jul': 7, 'aug': 8, 'ags': 8, 'agu': 8, 'sep': 9, 'oct': 10, 'okt': 10, 'nov': 11, 'dec': 12, 'des': 12
            };
            const month = months[monthStr];
            if (month) {
                let year = now.getFullYear();
                if (month > now.getMonth() + 1) year -= 1;
                
                let timeStr = '00:00:00';
                if (hourStr && minuteStr) {
                    timeStr = `${String(parseInt(hourStr, 10)).padStart(2, '0')}:${String(parseInt(minuteStr, 10)).padStart(2, '0')}:00`;
                }
                
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${timeStr}+07:00`;
            }
        }
        return null;
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

            const parsedPesananSKU = this.parsePesananSKU(rawText);
            const parsedGMV = this.parseGMV(rawText);
            const parsedDurationMinutes = this.parseDurationMinutes(rawText);
            const parsedLiveDate = this.parseLiveDate(rawText);



            return {
                success:               true,
                rawText,
                parsedGMV,
                parsedDurationMinutes,
                parsedPesananSKU,
                parsedLiveDate,
            };
        } catch (err: any) {
            return {
                success:               false,
                rawText:               '',
                parsedGMV:             0,
                parsedDurationMinutes: 0,
                parsedPesananSKU:      0,
                error:                 err.message,
            };
        }
    }
}

// Singleton — digunakan oleh TelegramBot
export const ocrService = new OCRService();

// Backward-compatible export untuk kode lama yang masih import langsung
export const extractFromImage = (imagePath: string) => ocrService.extractFromImage(imagePath);
