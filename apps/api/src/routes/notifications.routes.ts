import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as notificationService from '../services/notification.service.js';

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/notifications/my
 * Get all notifications for user.
 */
router.get('/my', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await notificationService.getUserNotifications(req.user!.userId);
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark notification as read.
 */
router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await notificationService.markNotificationAsRead(req.user!.userId, id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/notifications/read-all
 * Mark all notifications as read.
 */
router.post('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllNotificationsAsRead(req.user!.userId);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

export default router;
