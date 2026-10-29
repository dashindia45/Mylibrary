import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireStaff } from '../../middleware/auth.js';
import * as announcementService from '../../services/announcement.service.js';

const router = Router();
router.use(authenticate, requireStaff);

/**
 * POST /api/v1/admin/announcements
 * Create broadcast announcement.
 */
router.post('/announcements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const announcement = await announcementService.createAnnouncement(
      req.user!.userId,
      req.body
    );
    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/announcements/:id
 * Delete announcement.
 */
router.delete('/announcements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await announcementService.deleteAnnouncement(id);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
