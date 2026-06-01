import { Router } from 'express';
import { getMonitorStats, getMonitorMetrics, getDeliveryLogs } from '../controllers/monitor';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Fetch monitor logs and live architecture statuses
router.get('/', authenticateToken, getMonitorStats);
router.get('/metrics', authenticateToken, getMonitorMetrics);
router.get('/logs', authenticateToken, getDeliveryLogs);

export default router;
