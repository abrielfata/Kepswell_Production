import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/authMiddleware';
import { loginLimiter } from '../middleware/securityMiddleware';

const router = Router();
const ctrl = new AuthController();

// Login dilindungi rate limiter: maks 5 percobaan per 15 menit per IP
router.post('/login', loginLimiter, ctrl.login);
router.get('/me', authenticate, ctrl.getMe);
router.put('/change-password', authenticate, ctrl.changePassword);

export default router;

