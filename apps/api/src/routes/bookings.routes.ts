import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  holdSeatSchema,
  cancelBookingSchema,
  paginationSchema,
} from '@mylibrary/shared';
import * as bookingService from '../services/booking.service.js';

const router = Router();

// Require authentication for booking operations
router.use(authenticate);

/**
 * POST /api/v1/bookings/hold
 * Temporarily hold a seat for 10 minutes.
 */
router.post(
  '/hold',
  validateBody(holdSeatSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await bookingService.holdSeat(req.user!.userId, req.body);
      res.status(201).json({
        success: true,
        data: booking,
        message: 'Seat placed on hold for 10 minutes',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/bookings/hold/:id
 * Release an active seat hold.
 */
router.delete(
  '/hold/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const booking = await bookingService.releaseHold(req.user!.userId, id);
      res.json({
        success: true,
        data: booking,
        message: 'Seat hold released',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/bookings/my
 * Get current user bookings.
 */
router.get(
  '/my',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await bookingService.getUserBookings(req.user!.userId, {
        status,
        page,
        limit,
      });
      res.json({
        success: true,
        data: result,
        bookings: result.bookings,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/bookings/:id
 * Get single booking details.
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const booking = await bookingService.getBookingById(
        id,
        req.user!.userId,
        false
      );
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/bookings/:id/cancel
 * Cancel a booking.
 */
router.post(
  '/:id/cancel',
  validateBody(cancelBookingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const booking = await bookingService.cancelBooking(
        id,
        req.user!.userId,
        req.body.reason
      );
      res.json({
        success: true,
        data: booking,
        message: 'Booking successfully cancelled',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/bookings/:id/check-in
 * Member self-check-in via QR scan.
 */
router.post(
  '/:id/check-in',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const result = await bookingService.checkInBooking(id, 'QR');
      res.json({
        success: true,
        data: result.booking,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
