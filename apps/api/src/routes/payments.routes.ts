import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
} from '@mylibrary/shared';
import * as paymentService from '../services/payment.service.js';
import prisma from '../config/database.js';

const router = Router();

/**
 * POST /api/v1/payments/webhook
 * Razorpay webhook handler. Public endpoint with HMAC verification.
 */
router.post(
  '/webhook',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = (req.headers['x-razorpay-signature'] as string) || '';
      const rawBody = JSON.stringify(req.body);
      await paymentService.handleRazorpayWebhook(rawBody, signature, req.body);
      res.json({ status: 'ok' });
    } catch (err) {
      next(err);
    }
  }
);

// Authenticated payment routes
router.use(authenticate);

/**
 * POST /api/v1/payments/order
 * Create a new payment order.
 */
router.post(
  '/order',
  validateBody(createPaymentOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await paymentService.createPaymentOrder(req.user!.userId, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/payments/verify
 * Verify payment signature and update booking/invoice status.
 */
router.post(
  '/verify',
  validateBody(verifyPaymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await paymentService.verifyPayment(req.user!.userId, req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/payments/my
 * Get payment history for current user.
 */
router.get(
  '/my',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payments = await prisma.payment.findMany({
        where: {
          paymentOrder: {
            OR: [
              { booking: { userId: req.user!.userId } },
              { invoice: { membership: { userId: req.user!.userId } } },
            ],
          },
        },
        include: {
          paymentOrder: {
            include: {
              booking: { select: { date: true, shiftSlot: true } },
              invoice: { select: { billingMonth: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: payments });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
