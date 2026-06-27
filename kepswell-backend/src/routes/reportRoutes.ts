import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { authenticate, authorizeManager } from '../middleware/authMiddleware';

const router = Router();
const ctrl = new ReportController();

router.use(authenticate, authorizeManager);

router.get('/',                 ctrl.getAll);
router.get('/dashboard',        ctrl.getDashboardMetrics);
router.get('/available-months', ctrl.getAvailableMonths);
router.get('/statistics',       ctrl.getStatistics);
router.get('/ranking',          ctrl.getRanking);
router.get('/:id',              ctrl.getById);
router.put('/:id/status',       ctrl.verify);

export default router;
