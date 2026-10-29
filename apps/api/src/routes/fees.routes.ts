import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as feeService from '../services/fee.service.js';

const router = Router();

/**
 * GET /api/v1/fees/plans
 * List active membership plans.
 */
router.get('/plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await feeService.getMembershipPlans();
    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
});

// Authenticated user fee routes
router.use(authenticate);

/**
 * GET /api/v1/fees/membership/my
 * Current user membership details.
 */
router.get('/membership/my', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const membership = await feeService.getUserMembership(req.user!.userId);
    res.json({ success: true, data: membership });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/fees/invoices/my
 * List invoices for current user.
 */
router.get('/invoices/my', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoices = await feeService.getUserInvoices(req.user!.userId);
    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/fees/membership/join
 * Join or upgrade membership plan.
 */
router.post('/membership/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId, startDate } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const membership = await feeService.assignMembership({
      userId: req.user!.userId,
      planId,
      startDate: startDate || today,
    });
    res.status(201).json({
      success: true,
      data: membership,
      message: 'Membership activated successfully',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
