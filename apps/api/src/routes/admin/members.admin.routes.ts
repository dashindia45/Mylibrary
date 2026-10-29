import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database.js';
import { authenticate, requireStaff } from '../../middleware/auth.js';
import * as feeService from '../../services/fee.service.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireStaff);

/**
 * GET /api/v1/admin/members
 * List library members with search and pagination.
 */
router.get('/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, planId } = req.query;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status as string;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { contacts: { some: { contact: { contains: search as string } } } },
      ];
    }
    if (planId) {
      where.memberships = { some: { planId: planId as string, status: 'ACTIVE' } };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          contacts: true,
          userRoles: { include: { role: true } },
          memberships: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
            take: 1,
          },
          _count: {
            select: { bookings: true, complaints: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
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
 * GET /api/v1/admin/members/:id
 * Get full member profile and history.
 */
router.get('/members/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const member = await prisma.user.findUnique({
      where: { id },
      include: {
        contacts: true,
        userRoles: { include: { role: true } },
        memberships: {
          include: {
            plan: true,
            invoices: {
              include: { feePayments: true, adjustments: true },
              orderBy: { billingMonth: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        bookings: {
          include: {
            seat: { include: { section: { include: { floor: true } } } },
            checkIns: true,
          },
          orderBy: { date: 'desc' },
          take: 10,
        },
        complaints: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!member) {
      throw AppError.notFound('Member not found');
    }

    res.json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/members/:id/membership
 * Assign or update a membership for a member.
 */
router.post('/members/:id/membership', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { planId, startDate, endDate, monthlyFeePaise } = req.body;
    const membership = await feeService.assignMembership({
      userId: id,
      planId,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate,
      monthlyFeePaise,
    });
    res.status(201).json({ success: true, data: membership });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/members/:id/status
 * Update member account status (ACTIVE, SUSPENDED, DEACTIVATED).
 */
router.patch('/members/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: { status },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

export default router;
