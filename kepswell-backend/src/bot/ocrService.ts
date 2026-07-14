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
            // Handle 'j', 'jam', and OCR misreads like ')', ']', 'l', 'i'
            { regex: /(\d+)\s*(?:jam\b|j\b|\)|\]|l\b|i\b)(?:[,|\s]*(\d+)\s*(?:mnt|menit)\b)?/i, type: 'jam' },
            { regex: /(\d+)\s*(?:mnt|menit)\b/i,                     type: 'menit' },
            { regex: /(\d{1,2}):(\d{2}):(\d{2})/,                    type: 'hms' },
            { regex: /durasi[:\s]+(\d+)\s*(?:mnt|menit)\b/i,           type: 'menit' },
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
        const terjualMatch = clean.match(/Produk\s+terjual\s+di\s+LIVE\s+(\d+)/i);
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
        // Cari pola tanggal seperti "12 Jul", "12 July"
        const match = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
        if (match) {
            const day = parseInt(match[1], 10);
            const monthStr = match[2].toLowerCase();
            const months: Record<string, number> = {
                'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
                'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
            };
            const month = months[monthStr];
            if (month) {
                const now = new Date();
                let year = now.getFullYear();
                if (month > now.getMonth() + 1) year -= 1; // Jika bulan OCR lebih besar dari bulan saat ini, asumsikan tahun lalu
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
            form.append('OCREngine',         '3');
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

            // DEBUG LOG — hapus setelah masalah selesai
            console.log('=== OCR RAW TEXT ===');
            console.log(rawText);
            console.log('=== PARSED ===');
            console.log('GMV:', parsedGMV, '| Pesanan SKU:', parsedPesananSKU, '| Durasi (mnt):', parsedDurationMinutes, '| Live Date:', parsedLiveDate);
            console.log('====================');

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
