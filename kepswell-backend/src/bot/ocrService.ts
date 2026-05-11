import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { ENV } from '../config/env';

interface OcrResult {
    success: boolean;
    rawText: string;
    parsedGMV: number;
    parsedDurationMinutes: number;
    platform: 'TIKTOK' | 'SHOPEE';
    error?: string;
}

const parseGMV = (text: string): number => {
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
};

const parseDurationMinutes = (text: string): number => {
    const patterns = [
        // "1 jam 30 mnt" atau "1 jam 30 menit" (harus dicek dulu sebelum pattern menit saja)
        { regex: /(\d+)\s*jam(?:\s*(\d+)\s*(?:mnt|menit)\b)?/i, type: 'jam' },

        // "54 mnt" atau "54 menit"
        { regex: /(\d+)\s*(?:mnt|menit)\b/i, type: 'menit' },

        // Format HH:MM:SS
        { regex: /(\d{1,2}):(\d{2}):(\d{2})/, type: 'hms' },

        // "Durasi: 54 mnt" — label eksplisit sebagai fallback terakhir
        { regex: /durasi[:\s]+(\d+)\s*(?:mnt|menit)/i, type: 'menit' },
    ];

    for (const p of patterns) {
        const match = text.match(p.regex);
        if (!match) continue;
        if (p.type === 'jam')   return (parseInt(match[1]) || 0) * 60 + (parseInt(match[2]) || 0);
        if (p.type === 'menit') return parseInt(match[1]);
        if (p.type === 'hms')   return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    return 0;
};


const detectPlatform = (text: string): 'TIKTOK' | 'SHOPEE' => {
    const upper = text.toUpperCase();
    if (upper.includes('SHOPEE') || upper.includes('PENJUALAN') || upper.includes('PRODUK TERJUAL')) {
        return 'SHOPEE';
    }
    return 'TIKTOK';
};

export const extractFromImage = async (imagePath: string): Promise<OcrResult> => {
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
            parsedGMV:             parseGMV(rawText),
            parsedDurationMinutes: parseDurationMinutes(rawText),
            platform:              detectPlatform(rawText),
        };
    } catch (err: any) {
        return {
            success:               false,
            rawText:               '',
            parsedGMV:             0,
            parsedDurationMinutes: 0,
            platform:              'TIKTOK',
            error:                 err.message,
        };
    }
};
