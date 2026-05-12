import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
    OCRSPACE_API_KEY: process.env.OCRSPACE_API_KEY!,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    CHAT_ID_SALT: process.env.CHAT_ID_SALT!,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
};
