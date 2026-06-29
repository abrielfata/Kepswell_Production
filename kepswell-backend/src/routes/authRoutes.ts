import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate, authorizeOwner } from '../middleware/authMiddleware';

const router = Router();
const ctrl = new AuthController();

router.post('/login', ctrl.login);
router.get('/me', authenticate, ctrl.getMe);
router.put('/profile', authenticate, ctrl.updateProfile);

// Admin Management (Owner only)
router.get('/admins', authenticate, authorizeOwner, ctrl.getAllAdmins);
router.post('/admins', authenticate, authorizeOwner, ctrl.createAdmin);
router.delete('/admins/:id', authenticate, authorizeOwner, ctrl.deleteAdmin);

export default router;
