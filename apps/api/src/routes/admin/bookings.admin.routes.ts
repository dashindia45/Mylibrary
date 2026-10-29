import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database.js';
import { authenticate, requireStaff } from '../../middleware/auth.js';
import * as bookingService from '../../services/booking.service.js';
import * as paymentService from '../../services/payment.service.js';

const router = Router();
router.use(authenticate, requireStaff);

/**
 * GET /api/v1/admin/bookings
 * List bookings with filtering, search, and pagination.
 */
router.get('/bookings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, status, shiftSlot, search, floorId } = req.query;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status as string;
    if (shiftSlot) where.shiftSlot = shiftSlot as string;
    if (date) {
      where.date = new Date(`${date}T00:00:00.000Z`);
    }
    if (floorId) {
      where.seat = { section: { floorId: floorId as string } };
    }
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { contacts: { some: { contact: { contains: search as string } } } },
        ],
      };
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          seat: {
            include: { section: { include: { floor: true } } },
          },
          user: {
            select: { id: true, name: true, contacts: true },
          },
          checkIns: true,
          paymentOrders: { include: { payments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/bookings/:id/check-in
 * Staff manual check-in.
 */
router.post('/bookings/:id/check-in', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = await bookingService.checkInBooking(
      id,
      'MANUAL',
      req.user!.userId
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/bookings/:id/cancel
 * Staff cancel booking.
 */
router.post('/bookings/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;
    const booking = await bookingService.cancelBooking(
      id,
      req.user!.userId,
      reason,
      true
    );
    res.json({ success: true, data: booking, message: 'Booking cancelled' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/bookings/:id/collect
 * Staff collect cash or offline UPI for booking balance.
 */
router.post('/bookings/:id/collect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { amountPaise, method, reference, notes } = req.body;
    const result = await paymentService.recordOfflineCollection(req.user!.userId, {
      bookingId: id,
      amountPaise,
      method: method || 'CASH',
      reference,
      notes,
    });
    res.status(201).json({
      success: true,
      data: result,
      message: 'Offline payment recorded successfully',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
