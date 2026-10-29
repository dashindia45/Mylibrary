import { Router, Request, Response, NextFunction } from 'express';
import { optionalAuth, authenticate } from '../middleware/auth.js';
import * as announcementService from '../services/announcement.service.js';

const router = Router();

/**
 * GET /api/v1/announcements
 * View active announcements.
 */
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const announcements = await announcementService.getActiveAnnouncements(req.user?.userId);
    res.json({ success: true, data: announcements });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/announcements/:id/read
 * Mark announcement as read.
 */
router.post('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await announcementService.markAnnouncementRead(req.user!.userId, id);
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
});

export default router;
