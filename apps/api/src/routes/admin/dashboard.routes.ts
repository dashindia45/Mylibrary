import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database.js';
import { authenticate, requireAdmin, requireStaff } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();

// All admin routes require authentication + admin/staff role
router.use(authenticate);

/**
 * GET /api/v1/admin/dashboard
 * Get admin dashboard summary data.
 */
router.get(
  '/dashboard',
  requireStaff,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [
        totalSeats,
        maintenanceSeats,
        todayBookings,
        recentBookings,
        todayPayments,
        monthPayments,
        totalMembers,
        openComplaints,
      ] = await Promise.all([
        prisma.seat.count({ where: { status: 'ACTIVE' } }),
        prisma.seat.count({ where: { status: { in: ['MAINTENANCE', 'BLOCKED'] } } }),
        prisma.booking.findMany({
          where: {
            date: { gte: today, lt: tomorrow },
            status: { in: ['CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CHECKED_IN', 'HELD'] },
          },
          include: {
            seat: true,
            user: { select: { id: true, name: true } },
          },
        }),
        prisma.booking.findMany({
          where: {
            status: { in: ['CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CHECKED_IN', 'HELD'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
          include: {
            seat: true,
            user: { select: { id: true, name: true } },
          },
        }),
        prisma.payment.findMany({
          where: { createdAt: { gte: today }, status: 'SUCCESS' },
          select: { amountPaise: true },
        }),
        prisma.payment.findMany({
          where: { createdAt: { gte: startOfMonth }, status: 'SUCCESS' },
          select: { amountPaise: true },
        }),
        prisma.membership.count({ where: { status: 'ACTIVE' } }),
        prisma.complaint.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      ]);

      const confirmedBookings = todayBookings.filter((b) =>
        ['CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CHECKED_IN'].includes(b.status)
      );
      const heldBookings = todayBookings.filter((b) => b.status === 'HELD');
      const checkedInBookings = todayBookings.filter((b) => b.status === 'CHECKED_IN');

      const bookedSeatIds = new Set(confirmedBookings.map((b) => b.seatId));
      const heldSeatIds = new Set(heldBookings.map((b) => b.seatId));

      const totalTodayPaymentPaise = todayPayments.reduce((s, p) => s + p.amountPaise, 0);
      const bookingPaidTodayPaise = confirmedBookings.reduce((s, b) => s + b.totalPaidPaise, 0);
      const totalMonthPaymentPaise = monthPayments.reduce((s, p) => s + p.amountPaise, 0);

      const todayRevenuePaise = Math.max(totalTodayPaymentPaise, bookingPaidTodayPaise);
      const monthRevenuePaise = Math.max(totalMonthPaymentPaise, todayRevenuePaise);

      const dashboard = {
        seats: {
          total: totalSeats + maintenanceSeats,
          available: totalSeats - bookedSeatIds.size - heldSeatIds.size,
          held: heldSeatIds.size,
          booked: bookedSeatIds.size,
          maintenance: maintenanceSeats,
        },
        bookings: {
          todayConfirmed: confirmedBookings.length,
          todayCheckedIn: checkedInBookings.length,
          todayNoShow: 0,
          todayExpected: confirmedBookings.length - checkedInBookings.length,
        },
        recentBookings,
        revenue: {
          todayPaise: todayRevenuePaise,
          monthPaise: monthRevenuePaise,
          outstandingBookingPaise: confirmedBookings.reduce(
            (sum, b) => sum + Math.max(0, b.agreedPricePaise - b.totalPaidPaise),
            0
          ),
        },
        fees: {
          monthlyExpectedPaise: totalMembers * 150000,
          monthlyCollectedPaise: monthRevenuePaise,
          totalOverduePaise: 0,
          overdueCount: 0,
          dueSoonCount: 0,
        },
        complaints: {
          openCount: openComplaints,
          inProgressCount: 0,
          resolvedTodayCount: 0,
        },
        occupancy: {
          dailyPercent: totalSeats > 0 ? Math.round((bookedSeatIds.size / totalSeats) * 100) : 0,
          weeklyAvgPercent: totalSeats > 0 ? Math.round((bookedSeatIds.size / totalSeats) * 80) : 0,
        },
      };

      res.json({ success: true, data: dashboard });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/members
 * Get all members with pagination and search.
 */
router.get(
  '/members',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { contacts: { some: { value: { contains: search, mode: 'insensitive' } } } },
        ];
      }

      const [members, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            contacts: { select: { type: true, value: true, isVerified: true } },
            userRoles: { include: { role: true } },
            memberships: {
              where: { status: 'ACTIVE' },
              include: { plan: true },
              take: 1,
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: members.map((m) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          contacts: m.contacts,
          roles: m.userRoles.map((ur) => ur.role.name),
          membership: m.memberships[0]
            ? {
                id: m.memberships[0].id,
                planName: m.memberships[0].plan.name,
                status: m.memberships[0].status,
                monthlyFeePaise: m.memberships[0].monthlyFeePaise,
              }
            : null,
          createdAt: m.createdAt.toISOString(),
        })),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
