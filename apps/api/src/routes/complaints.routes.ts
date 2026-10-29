import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createComplaintSchema,
  complaintMessageSchema,
} from '@mylibrary/shared';
import * as complaintService from '../services/complaint.service.js';

const router = Router();

router.use(authenticate);

/**
 * POST /api/v1/complaints
 * Create a new complaint.
 */
router.post(
  '/',
  validateBody(createComplaintSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const complaint = await complaintService.createComplaint(
        req.user!.userId,
        req.body
      );
      res.status(201).json({
        success: true,
        data: complaint,
        message: 'Complaint submitted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/complaints/my
 * List complaints submitted by user.
 */
router.get('/my', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const complaints = await complaintService.getUserComplaints(req.user!.userId);
    res.json({ success: true, data: complaints });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/complaints/:id
 * Get single complaint thread.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const complaint = await complaintService.getComplaintById(
      id,
      req.user!.userId,
      false
    );
    res.json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/complaints/:id/messages
 * Post a reply to complaint.
 */
router.post(
  '/:id/messages',
  validateBody(complaintMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const message = await complaintService.addComplaintMessage(
        id,
        req.user!.userId,
        req.body,
        false
      );
      res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
