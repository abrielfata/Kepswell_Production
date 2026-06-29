import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate, authorizeOwner } from '../middleware/authMiddleware';

const router = Router();
const ctrl = new AuthController();

router.post('/login', ctrl.login);
router.get('/me', authenticate, ctrl.getMe);
router.put('/profile', authenticate, ctrl.updateProfile);

// Manager Management Routes (Owner Only)
router.get('/managers', authenticate, authorizeOwner, ctrl.getManagers);
router.post('/managers', authenticate, authorizeOwner, ctrl.createManager);
router.delete('/managers/:id', authenticate, authorizeOwner, ctrl.deleteManager);

export default router;
