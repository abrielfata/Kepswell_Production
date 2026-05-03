import express from 'express';
import { ENV } from './config/env';
import { errorHandler } from './middleware/errorMiddleware';
import authRoutes   from './routes/authRoutes';
import hostRoutes   from './routes/hostRoutes';
import reportRoutes from './routes/reportRoutes';
import { processUpdate, startPolling, setupWebhook } from './bot/telegramBot';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ALLOWED_ORIGINS = [
    ENV.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
];

app.use((req, res, next) => {
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.includes(origin) || ENV.NODE_ENV === 'development') {
        res.header('Access-Control-Allow-Origin',  origin || '*');
    }
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
    next();
});

app.get('/', (_, res) => {
    res.json({ success: true, message: 'Kepswell API', version: '2.0.0' });
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

    if (ENV.NODE_ENV === 'development') {
        // Di localhost: gunakan Long Polling (tidak perlu ngrok/domain publik)
        startPolling();
    } else {
        // Di production (Render): daftarkan webhook otomatis menggunakan RENDER_EXTERNAL_URL
        const renderUrl = process.env.RENDER_EXTERNAL_URL;
        if (renderUrl) {
            const webhookUrl = `${renderUrl}/api/bot/webhook`;
            setupWebhook(webhookUrl)
                .then(() => console.log(`🤖 Webhook registered: ${webhookUrl}`))
                .catch(err => console.error('❌ Webhook setup failed:', err.message));
        } else {
            console.log('⚠️  RENDER_EXTERNAL_URL tidak ditemukan. Setup webhook manual via GET /api/bot/setup-webhook');
        }
    }
});

export default app;
