import { Router } from 'express';
import {
  createNotification,
  getNotifications,
  getUnreadNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} from '../controllers/notification';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { rateLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

// Only admin can publish new notifications (Rate limited: Max 20/min)
router.post('/', authenticateToken, requireRole(['ADMIN']), rateLimiter(20, 60), createNotification);

// Authenticated users retrieve their notifications
router.get('/', authenticateToken, getNotifications);
router.get('/unread', authenticateToken, getUnreadNotifications);

// Mark read routes
router.patch('/read-all', authenticateToken, markAllRead);
router.patch('/:id/read', authenticateToken, markRead);

// Delete notifications
router.delete('/:id', authenticateToken, deleteNotification);

export default router;
