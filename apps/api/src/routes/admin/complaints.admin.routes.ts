import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireStaff } from '../../middleware/auth.js';
import * as complaintService from '../../services/complaint.service.js';

const router = Router();
router.use(authenticate, requireStaff);

/**
 * GET /api/v1/admin/complaints
 * List complaints with category, severity, and status filters.
 */
router.get('/complaints', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, category, severity } = req.query;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await complaintService.getAllComplaints({
      status: status as string,
      category: category as string,
      severity: severity as string,
      page,
      limit,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/complaints/:id
 * Get single complaint with internal notes.
 */
router.get('/complaints/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const complaint = await complaintService.getComplaintById(
      id,
      req.user!.userId,
      true
    );
    res.json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/complaints/:id/status
 * Update complaint status or assign staff member.
 */
router.patch('/complaints/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status, assignedStaffId } = req.body;
    const complaint = await complaintService.updateComplaintStatus(
      id,
      status,
      assignedStaffId
    );
    res.json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/complaints/:id/messages
 * Add reply or internal staff note.
 */
router.post('/complaints/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const message = await complaintService.addComplaintMessage(
      id,
      req.user!.userId,
      req.body,
      true
    );
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

export default router;
