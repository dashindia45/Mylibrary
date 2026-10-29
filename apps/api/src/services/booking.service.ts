import prisma from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { SHIFT_CONFLICTS } from '@mylibrary/shared';
import type { HoldSeatInput, CreateBookingInput } from '@mylibrary/shared';

/**
 * Check if a seat is blocked by admin maintenance/block for a date.
 */
async function isSeatBlocked(seatId: string, date: Date): Promise<boolean> {
  const block = await prisma.seatBlock.findFirst({
    where: {
      seatId,
      startDate: { lte: date },
      OR: [
        { endDate: null },
        { endDate: { gte: date } },
      ],
    },
  });
  return !!block;
}

/**
 * Check if conflicting active bookings exist for seat, date, and shift.
 */
async function findConflictingBookings(seatId: string, date: Date, shiftSlot: string, excludeBookingId?: string) {
  const conflictingSlots = SHIFT_CONFLICTS[shiftSlot] || [shiftSlot];
  const now = new Date();

  return prisma.booking.findMany({
    where: {
      seatId,
      date,
      shiftSlot: { in: conflictingSlots },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      OR: [
        { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
        {
          status: 'HELD',
          holdExpiresAt: { gt: now },
        },
      ],
    },
  });
}

/**
 * Hold a seat for 10 minutes (or configured hold duration).
 */
export async function holdSeat(userId: string, input: HoldSeatInput) {
  const targetDate = new Date(`${input.date}T00:00:00.000Z`);

  // Verify seat exists and is ACTIVE
  const seat = await prisma.seat.findUnique({
    where: { id: input.seatId },
    include: { section: { include: { floor: true } } },
  });

  if (!seat || seat.status !== 'ACTIVE') {
    throw AppError.notFound('Seat not found or currently unavailable');
  }

  // Check admin blocks
  if (await isSeatBlocked(input.seatId, targetDate)) {
    throw AppError.conflict('Seat is currently blocked for maintenance or administrative hold');
  }

  // Enforce rule: 1 user can book only 1 seat on any given date
  const now = new Date();
  const existingUserBooking = await prisma.booking.findFirst({
    where: {
      userId,
      date: targetDate,
      OR: [
        { status: { in: ['CONFIRMED', 'CHECKED_IN', 'PARTIALLY_PAID', 'PAID'] } },
        {
          status: 'HELD',
          holdExpiresAt: { gt: now },
        },
      ],
    },
    include: {
      seat: true,
    },
  });

  if (existingUserBooking) {
    // If the user already has an active hold on this exact same seat & shift, allow them to resume it
    const isSameHold =
      existingUserBooking.seatId === input.seatId &&
      existingUserBooking.shiftSlot === input.shiftSlot &&
      existingUserBooking.status === 'HELD';

    if (!isSameHold) {
      const existingSeatNum = existingUserBooking.seat?.seatNumber || 'another desk';
      throw AppError.badRequest(
        `You already have Desk ${existingSeatNum} booked/reserved for ${input.date}. Each user is allowed to book only 1 seat.`
      );
    }
  }

  // Check conflicting bookings
  const conflicts = await findConflictingBookings(input.seatId, targetDate, input.shiftSlot);
  if (conflicts.length > 0) {
    // If the conflict is the same user with an active hold on the same seat, return existing hold
    const userHold = conflicts.find(c => c.userId === userId && c.status === 'HELD' && c.shiftSlot === input.shiftSlot);
    if (userHold) {
      return prisma.booking.findUnique({
        where: { id: userHold.id },
        include: {
          seat: {
            include: { section: { include: { floor: true } } },
          },
        },
      });
    }
    throw AppError.conflict('Seat is already booked or on hold for this time slot');
  }

  // Get hold duration setting
  const holdSetting = await prisma.librarySetting.findUnique({
    where: { key: 'hold_duration_minutes' },
  });
  const holdMinutes = holdSetting ? parseInt(holdSetting.value, 10) : 10;
  const holdExpiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

  // Get shift times
  const shift = await prisma.shiftType.findUnique({
    where: { slot: input.shiftSlot },
  });
  if (!shift || !shift.isActive) {
    throw AppError.badRequest('Invalid or inactive shift slot selected');
  }

  // Get pricing
  const pricing = await prisma.pricingRule.findUnique({
    where: {
      shiftTypeId_seatType: {
        shiftTypeId: shift.id,
        seatType: seat.seatType,
      },
    },
  });
  const agreedPricePaise = pricing ? pricing.pricePaise : 150000; // default ₹1500 if not configured

  // Get token amount setting
  const tokenSetting = await prisma.librarySetting.findUnique({
    where: { key: 'token_amount_paise' },
  });
  const tokenAmountPaise = tokenSetting ? parseInt(tokenSetting.value, 10) : 10000; // default ₹100

  // Upsert booking for this seatId, date, shiftSlot
  // If an expired or cancelled booking existed for this exact slot, reuse it
  const booking = await prisma.booking.upsert({
    where: {
      seatId_date_shiftSlot: {
        seatId: input.seatId,
        date: targetDate,
        shiftSlot: input.shiftSlot,
      },
    },
    update: {
      userId,
      shiftStartTime: shift.startTime,
      shiftEndTime: shift.endTime,
      status: 'HELD',
      paymentOption: 'TOKEN',
      agreedPricePaise,
      tokenAmountPaise,
      totalPaidPaise: 0,
      holdExpiresAt,
      cancelledAt: null,
      cancelReason: null,
    },
    create: {
      userId,
      seatId: input.seatId,
      date: targetDate,
      shiftSlot: input.shiftSlot,
      shiftStartTime: shift.startTime,
      shiftEndTime: shift.endTime,
      status: 'HELD',
      paymentOption: 'TOKEN',
      agreedPricePaise,
      tokenAmountPaise,
      totalPaidPaise: 0,
      holdExpiresAt,
    },
    include: {
      seat: {
        include: { section: { include: { floor: true } } },
      },
    },
  });

  // Record audit event
  await prisma.bookingEvent.create({
    data: {
      bookingId: booking.id,
      fromStatus: null,
      toStatus: 'HELD',
      note: `Seat placed on hold until ${holdExpiresAt.toISOString()}`,
      actorId: userId,
    },
  });

  return booking;
}

/**
 * Release an active seat hold.
 */
export async function releaseHold(userId: string, bookingId: string, isAdmin = false) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw AppError.notFound('Booking not found');
  }

  if (!isAdmin && booking.userId !== userId) {
    throw AppError.forbidden('You are not authorized to release this hold');
  }

  if (booking.status !== 'HELD') {
    throw AppError.badRequest('Only held seats can be released');
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      holdExpiresAt: null,
      cancelledAt: new Date(),
      cancelReason: 'Hold released by user',
    },
  });

  await prisma.bookingEvent.create({
    data: {
      bookingId,
      fromStatus: 'HELD',
      toStatus: 'CANCELLED',
      note: 'Hold manually released',
      actorId: userId,
    },
  });

  return updated;
}

/**
 * Check-in a booking via QR code or staff manual action.
 */
export async function checkInBooking(
  bookingId: string,
  method: 'QR' | 'MANUAL',
  staffId?: string
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      seat: { include: { section: { include: { floor: true } } } },
      user: true,
    },
  });

  if (!booking) {
    throw AppError.notFound('Booking not found');
  }

  if (booking.status !== 'CONFIRMED') {
    if (booking.status === 'CHECKED_IN') {
      return { booking, message: 'Already checked in' };
    }
    throw AppError.badRequest(`Cannot check in a booking with status ${booking.status}`);
  }

  const [updatedBooking, checkIn] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CHECKED_IN' },
      include: {
        seat: { include: { section: { include: { floor: true } } } },
        user: true,
      },
    }),
    prisma.checkIn.create({
      data: {
        bookingId,
        method,
        staffId,
        checkedAt: new Date(),
      },
    }),
    prisma.bookingEvent.create({
      data: {
        bookingId,
        fromStatus: 'CONFIRMED',
        toStatus: 'CHECKED_IN',
        note: `Check-in recorded via ${method}`,
        actorId: staffId || booking.userId,
      },
    }),
  ]);

  return { booking: updatedBooking, checkIn, message: 'Check-in successful' };
}

/**
 * Cancel a booking and alert waitlisted users if any.
 */
export async function cancelBooking(
  bookingId: string,
  userId: string,
  reason?: string,
  isAdmin = false
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { seat: true },
  });

  if (!booking) {
    throw AppError.notFound('Booking not found');
  }

  if (!isAdmin && booking.userId !== userId) {
    throw AppError.forbidden('You are not authorized to cancel this booking');
  }

  if (['CANCELLED', 'COMPLETED'].includes(booking.status)) {
    throw AppError.badRequest(`Booking is already ${booking.status.toLowerCase()}`);
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: reason || 'Cancelled by user',
    },
  });

  await prisma.bookingEvent.create({
    data: {
      bookingId,
      fromStatus: booking.status,
      toStatus: 'CANCELLED',
      note: reason || 'Booking cancelled',
      actorId: userId,
    },
  });

  // Check waitlist for this slot
  const nextInWaitlist = await prisma.waitlistEntry.findFirst({
    where: {
      seatId: booking.seatId,
      date: booking.date,
      shiftSlot: booking.shiftSlot,
      status: 'WAITING',
    },
    orderBy: { createdAt: 'asc' },
  });

  if (nextInWaitlist) {
    await prisma.waitlistEntry.update({
      where: { id: nextInWaitlist.id },
      data: {
        status: 'NOTIFIED',
        notifiedAt: new Date(),
        claimBy: new Date(Date.now() + 15 * 60 * 1000), // 15 mins to claim
      },
    });

    // Send in-app notification
    await prisma.notification.create({
      data: {
        userId: nextInWaitlist.userId,
        type: 'WAITLIST_SEAT_AVAILABLE',
        title: 'Seat Available!',
        body: `A seat you were waitlisted for on ${booking.date.toISOString().split('T')[0]} has opened up. You have 15 minutes to claim it.`,
        channel: 'IN_APP',
        referenceId: booking.seatId,
        referenceType: 'SEAT',
      },
    });
  }

  return updated;
}

/**
 * Get user bookings with optional pagination and filters.
 */
export async function getUserBookings(
  userId: string,
  options: { status?: string; page?: number; limit?: number } = {}
) {
  const { status, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (status) {
    where.status = status;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        seat: {
          include: {
            section: { include: { floor: true } },
          },
        },
        checkIns: true,
        paymentOrders: {
          include: { payments: true },
        },
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single booking by ID.
 */
export async function getBookingById(bookingId: string, userId?: string, isAdmin = false) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      seat: {
        include: {
          section: { include: { floor: true } },
        },
      },
      checkIns: true,
      events: { orderBy: { createdAt: 'asc' } },
      paymentOrders: {
        include: { payments: true },
      },
      user: {
        select: { id: true, name: true, contacts: true },
      },
    },
  });

  if (!booking) {
    throw AppError.notFound('Booking not found');
  }

  if (!isAdmin && userId && booking.userId !== userId) {
    throw AppError.forbidden('You are not authorized to view this booking');
  }

  return booking;
}
