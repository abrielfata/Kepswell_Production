import { Router } from 'express';
import { ScheduleController } from '../controllers/ScheduleController';
import { authenticate, authorizeManager } from '../middleware/authMiddleware';

const router = Router();
const scheduleController = new ScheduleController();

// Semua rute schedule butuh auth dan akses MANAGER
router.use(authenticate, authorizeManager);

router.get('/', scheduleController.handleGetSchedule);
router.put('/', scheduleController.handleSaveSchedule);

export default router;
