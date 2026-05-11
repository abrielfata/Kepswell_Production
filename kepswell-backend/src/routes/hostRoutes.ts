import { Router } from 'express';
import { HostController } from '../controllers/HostController';
import { authenticate, authorizeManager } from '../middleware/authMiddleware';

const router = Router();
const ctrl = new HostController();

router.use(authenticate, authorizeManager);

router.get('/',                       ctrl.getAll);
router.get('/:id',                    ctrl.getById);
router.post('/',                      ctrl.create);
router.put('/:id',                    ctrl.update);
router.delete('/:id',                 ctrl.delete);
router.patch('/:id/toggle',           ctrl.toggleStatus);
router.patch('/:id/regenerate-registration-code', ctrl.regenerateRegistrationCode);

export default router;
