import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';

const router = Router();
router.use(authenticate, requireAdmin);

/**
 * GET /api/v1/admin/settings
 * List all library configuration settings.
 */
router.get('/settings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.librarySetting.findMany({
      orderBy: { category: 'asc' },
    });
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/settings/:key
 * Update a library configuration setting value.
 */
router.patch('/settings/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.params.key as string;
    const { value } = req.body;
    const setting = await prisma.librarySetting.update({
      where: { key },
      data: { value: String(value) },
    });
    res.json({ success: true, data: setting });
  } catch (err) {
    next(err);
  }
});

export default router;
