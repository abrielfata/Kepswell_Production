import express from 'express';
import path from 'path';
import helmet from 'helmet';
import { ENV } from './config/env';
import { errorHandler } from './middleware/errorMiddleware';
import { authenticate, authorizeManager } from './middleware/authMiddleware';
import { apiLimiter } from './middleware/securityMiddleware';
import authRoutes   from './routes/authRoutes';
import hostRoutes   from './routes/hostRoutes';
import reportRoutes from './routes/reportRoutes';
import { processUpdate, setupWebhook } from './bot/telegramBot';

const app = express();

// ── Security Headers ──
app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Global Rate Limiter ──
app.use('/api', apiLimiter);

// ── Uploads: public access so images can be loaded in <img> tags ──
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const VERCEL_PATTERN = /^https:\/\/(kepstore|kepswell).*\.vercel\.app$/;

const isAllowedOrigin = (origin: string): boolean => {
    if (!origin) return false;
    // Localhost dev
    if (['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'].includes(origin)) return true;
    // URL production statis dari env
    if (ENV.FRONTEND_URL && origin === ENV.FRONTEND_URL) return true;
    // Semua preview/production URL Vercel milik project ini
    if (VERCEL_PATTERN.test(origin)) return true;
    return false;
};

app.use((req, res, next) => {
    const origin = req.headers.origin || '';
    if (isAllowedOrigin(origin) || ENV.NODE_ENV === 'development') {
        res.header('Access-Control-Allow-Origin', origin || '*');
    }
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
    next();
});

app.get('/', (_, res) => {
    res.json({ success: true, message: 'Kepstore API', version: '2.0.0' });
});

app.use('/api/auth',    authRoutes);
app.use('/api/hosts',   hostRoutes);
app.use('/api/reports', reportRoutes);

app.post('/api/bot/webhook', (req, res) => {
    res.sendStatus(200);
    processUpdate(req.body).catch(console.error);
});

// Endpoint manual untuk mendaftarkan webhook (panggil sekali setelah deploy)
app.get('/api/bot/setup-webhook', async (req, res) => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `https://${req.headers.host}`;
    const webhookUrl = `${baseUrl}/api/bot/webhook`;
    try {
        await setupWebhook(webhookUrl);
        res.json({ success: true, webhook_url: webhookUrl });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.use(errorHandler);

app.listen(ENV.PORT, async () => {
    console.log(`🚀 Server running on port ${ENV.PORT}`);
    console.log(`📍 ENV: ${ENV.NODE_ENV}`);

    const renderUrl = process.env.RENDER_EXTERNAL_URL;
    if (renderUrl) {
        const webhookUrl = `${renderUrl}/api/bot/webhook`;
        setupWebhook(webhookUrl)
            .then(() => console.log(`🤖 Webhook registered: ${webhookUrl}`))
            .catch(err => console.error('❌ Webhook setup failed:', err.message));
    } else {
        console.log('⚠️  RENDER_EXTERNAL_URL tidak ditemukan. Setup webhook manual via GET /api/bot/setup-webhook');
    }
});

export default app;
