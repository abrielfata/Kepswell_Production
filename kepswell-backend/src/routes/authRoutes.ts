import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();
const ctrl = new AuthController();

router.post('/login', ctrl.login);
router.get('/me', authenticate, ctrl.getMe);

export default router;
