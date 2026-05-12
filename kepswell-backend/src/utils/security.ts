import crypto from 'crypto';
import { ENV } from '../config/env';

const ALGORITHM = 'aes-256-cbc';
const SALT = process.env.CHAT_ID_SALT || 'default_salt';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || '0'.repeat(64), 'hex');

export const hashChatId = (chatId: string): string => {
    return crypto.createHash('sha256')
        .update(chatId + SALT)
        .digest('hex');
};

export const encrypt = (text: string): string => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

export const decrypt = (text: string): string => {
    try {
        const [ivHex, encrypted] = text.split(':');
        if (!ivHex || !encrypted) return text; // Return as is if not encrypted format
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        return text; // Fallback
    }
};
