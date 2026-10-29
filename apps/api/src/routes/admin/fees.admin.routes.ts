import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database.js';
import { authenticate, requireStaff } from '../../middleware/auth.js';
import * as feeService from '../../services/fee.service.js';
import * as paymentService from '../../services/payment.service.js';

const router = Router();
router.use(authenticate, requireStaff);

/**
 * GET /api/v1/admin/fees/invoices
 * List all invoices across members with status and month filters.
 */
router.get('/fees/invoices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, billingMonth } = req.query;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await feeService.getAllInvoices({
      status: status as string,
      billingMonth: billingMonth as string,
      page,
      limit,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/fees/invoices/generate
 * Generate invoices for all active members for a billing month (default: current month).
 */
router.post('/fees/invoices/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const billingMonth = req.body.billingMonth || currentMonth;

    const activeMemberships = await prisma.membership.findMany({
      where: { status: 'ACTIVE' },
    });

    const generated = [];
    for (const membership of activeMemberships) {
      const invoice = await feeService.generateInvoiceForMembership(
        membership.id,
        billingMonth
      );
      generated.push(invoice);
    }

    res.status(201).json({
      success: true,
      data: { count: generated.length, billingMonth },
      message: `Generated ${generated.length} invoices for ${billingMonth}`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/fees/adjustments
 * Apply discount or credit adjustment to an invoice.
 */
router.post('/fees/adjustments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await feeService.applyFeeAdjustment(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/fees/collect
 * Staff collect cash or offline UPI for fee invoice.
 */
router.post('/fees/collect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { invoiceId, amountPaise, method, reference, notes } = req.body;
    const result = await paymentService.recordOfflineCollection(req.user!.userId, {
      invoiceId,
      amountPaise,
      method: method || 'CASH',
      reference,
      notes,
    });
    res.status(201).json({
      success: true,
      data: result,
      message: 'Fee payment recorded successfully',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
