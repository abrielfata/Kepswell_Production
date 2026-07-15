import rateLimit from 'express-rate-limit';

/**
 * Rate limiter untuk endpoint login.
 * Mencegah brute-force: maks 5 percobaan login per IP dalam 15 menit.
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 menit
    max: 5,                      // maks 5 request per windowMs
    standardHeaders: true,       // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,        // Disable `X-RateLimit-*` headers
    message: {
        success: false,
        message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.',
    },
});

/**
 * Rate limiter global untuk seluruh API.
 * Mencegah DDoS / abuse: maks 100 request per IP per menit.
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,    // 1 menit
    max: 100,                // maks 100 request per menit
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Terlalu banyak request. Silakan coba lagi nanti.',
    },
});
