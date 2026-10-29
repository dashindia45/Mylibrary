import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { availabilityQuerySchema } from '@mylibrary/shared';
import { SHIFT_CONFLICTS } from '@mylibrary/shared';

const router = Router();

/**
 * GET /api/v1/floors
 * Get all floors with sections.
 */
router.get('/floors', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const floors = await prisma.floor.findMany({
      where: { status: 'ACTIVE' },
      include: {
        sections: {
          include: {
            seats: {
              where: { status: { not: 'INACTIVE' } },
              orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }],
            },
          },
        },
      },
      orderBy: { floorNumber: 'asc' },
    });

    res.json({ success: true, data: floors });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/shifts
 * Get active shift types.
 */
router.get('/shifts', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const shifts = await prisma.shiftType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: shifts });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/availability
 * Get seat availability for a date and optional shift.
 */
router.get(
  '/availability',
  validateQuery(availabilityQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date, shiftSlot, floorId, sectionId } = req.query as any;
      const bookingDate = new Date(date as string);

      // Get active shifts
      const shifts = await prisma.shiftType.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      // Build seat query
      const seatWhere: any = { status: 'ACTIVE' };
      if (sectionId) {
        seatWhere.sectionId = sectionId;
      } else if (floorId) {
        seatWhere.section = { floorId };
      }

      // Get all active seats with section and floor info
      const seats = await prisma.seat.findMany({
        where: seatWhere,
        include: {
          section: {
            include: { floor: true },
          },
        },
        orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }],
      });

      const now = new Date();
      // Get bookings for this date (active ones and non-expired holds)
      const existingBookings = await prisma.booking.findMany({
        where: {
          date: bookingDate,
          OR: [
            { status: { in: ['CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CHECKED_IN'] } },
            { status: 'HELD', holdExpiresAt: { gt: now } },
          ],
        },
        select: { seatId: true, shiftSlot: true, status: true },
      });

      // Get seat blocks
      const seatBlocks = await prisma.seatBlock.findMany({
        where: {
          startDate: { lte: bookingDate },
          OR: [
            { endDate: null },
            { endDate: { gte: bookingDate } },
          ],
        },
        select: { seatId: true },
      });
      const blockedSeatIds = new Set(seatBlocks.map((b) => b.seatId));

      // Check if date is a holiday
      const holiday = await prisma.holiday.findUnique({
        where: { date: bookingDate },
      });

      if (holiday) {
        res.json({
          success: true,
          data: {
            date,
            isHoliday: true,
            holidayName: holiday.name,
            seats: [],
          },
        });
        return;
      }

      // Get pricing rules
      const pricingRules = await prisma.pricingRule.findMany({
        where: { isActive: true },
      });

      // Build booking map: seatId -> set of booked shifts
      const bookingMap = new Map<string, Set<string>>();
      for (const booking of existingBookings) {
        if (!bookingMap.has(booking.seatId)) {
          bookingMap.set(booking.seatId, new Set());
        }
        bookingMap.get(booking.seatId)!.add(booking.shiftSlot);
      }

      // Build availability response
      const availability = seats.map((seat) => {
        const bookedShifts = bookingMap.get(seat.id) || new Set<string>();
        const isBlocked = blockedSeatIds.has(seat.id) || seat.status !== 'ACTIVE';

        const isFullDayBooked =
          bookedShifts.has('FULL_DAY') ||
          (bookedShifts.has('MORNING') && bookedShifts.has('EVENING'));
        const isHalfDayBooked =
          !isFullDayBooked && (bookedShifts.has('MORNING') || bookedShifts.has('EVENING'));

        let overallBookingStatus = 'AVAILABLE';
        if (isBlocked) {
          overallBookingStatus = 'MAINTENANCE';
        } else if (isFullDayBooked) {
          overallBookingStatus = 'BOOKED';
        } else if (isHalfDayBooked) {
          overallBookingStatus = 'HALF_DAY_BOOKED';
        }

        const shiftAvailability = shifts
          .filter((s) => !shiftSlot || s.slot === shiftSlot)
          .map((shift) => {
            const conflicts = SHIFT_CONFLICTS[shift.slot] || [];
            const hasConflict = conflicts.some((c: string) => bookedShifts.has(c));
            const isThisShiftBooked = bookedShifts.has(shift.slot);

            // Find price
            const rule = pricingRules.find(
              (r) => r.shiftTypeId === shift.id && r.seatType === seat.seatType
            );

            return {
              shiftSlot: shift.slot,
              shiftName: shift.name,
              available: !isBlocked && !hasConflict,
              pricePaise: rule?.pricePaise || 0,
              startTime: shift.startTime,
              endTime: shift.endTime,
              isBooked: isThisShiftBooked,
              hasConflict,
            };
          });

        return {
          seatId: seat.id,
          seat: {
            id: seat.id,
            sectionId: seat.sectionId,
            seatNumber: seat.seatNumber,
            seatType: seat.seatType,
            amenities: seat.amenities,
            positionX: seat.positionX,
            positionY: seat.positionY,
            label: seat.label,
            status: isBlocked ? 'BLOCKED' : seat.status,
            bookingStatus: overallBookingStatus,
            isFullDayBooked,
            isHalfDayBooked,
            bookedShifts: Array.from(bookedShifts),
          },
          section: {
            id: seat.section.id,
            name: seat.section.name,
            sectionType: seat.section.sectionType,
          },
          floor: {
            id: seat.section.floor.id,
            name: seat.section.floor.name,
            floorNumber: seat.section.floor.floorNumber,
          },
          shifts: shiftAvailability,
          isFullDayBooked,
          isHalfDayBooked,
          bookedShifts: Array.from(bookedShifts),
        };
      });

      res.json({
        success: true,
        data: {
          date,
          isHoliday: false,
          seats: availability,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/pricing
 * Get pricing rules.
 */
router.get('/pricing', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.pricingRule.findMany({
      where: { isActive: true },
      include: { shiftType: true },
    });

    res.json({
      success: true,
      data: rules.map((r) => ({
        id: r.id,
        shiftSlot: r.shiftType.slot,
        shiftName: r.shiftType.name,
        seatType: r.seatType,
        pricePaise: r.pricePaise,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/seat-types
 * Get all active seat types for filters and badges.
 */
router.get('/seat-types', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const seatTypes = await prisma.seatTypeConfig.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: seatTypes });
  } catch (err) {
    next(err);
  }
});

export default router;
