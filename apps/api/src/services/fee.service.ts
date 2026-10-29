import prisma from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { FeeAdjustmentInput, AssignMembershipInput } from '@mylibrary/shared';

/**
 * Get all available membership plans.
 */
export async function getMembershipPlans() {
  return prisma.membershipPlan.findMany({
    where: { isActive: true },
    orderBy: { monthlyFeePaise: 'asc' },
  });
}

/**
 * Get active membership for a user.
 */
export async function getUserMembership(userId: string) {
  return prisma.membership.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      plan: true,
      invoices: {
        orderBy: { billingMonth: 'desc' },
        take: 12,
        include: {
          feePayments: true,
          adjustments: true,
        },
      },
    },
  });
}

/**
 * Assign or update a membership for a user.
 */
export async function assignMembership(input: AssignMembershipInput) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: input.planId },
  });

  if (!plan) {
    throw AppError.notFound('Membership plan not found');
  }

  const startDate = new Date(`${input.startDate}T00:00:00.000Z`);
  const endDate = input.endDate ? new Date(`${input.endDate}T00:00:00.000Z`) : null;
  const monthlyFeePaise = input.monthlyFeePaise || plan.monthlyFeePaise;

  // Deactivate any currently active memberships
  await prisma.membership.updateMany({
    where: { userId: input.userId, status: 'ACTIVE' },
    data: { status: 'EXPIRED' },
  });

  const membership = await prisma.membership.create({
    data: {
      userId: input.userId,
      planId: input.planId,
      status: 'ACTIVE',
      startDate,
      endDate,
      monthlyFeePaise,
    },
    include: { plan: true },
  });

  // Automatically generate invoice for the starting billing month
  const billingMonth = input.startDate.slice(0, 7); // YYYY-MM
  await generateInvoiceForMembership(membership.id, billingMonth);

  return membership;
}

/**
 * Generate an invoice for a membership for a specific month (YYYY-MM).
 */
export async function generateInvoiceForMembership(membershipId: string, billingMonth: string) {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
  });

  if (!membership) {
    throw AppError.notFound('Membership not found');
  }

  // Invoice due date is 5th of that billing month
  const dueDate = new Date(`${billingMonth}-05T00:00:00.000Z`);

  return prisma.feeInvoice.upsert({
    where: {
      membershipId_billingMonth: {
        membershipId,
        billingMonth,
      },
    },
    update: {},
    create: {
      membershipId,
      billingMonth,
      amountPaise: membership.monthlyFeePaise,
      adjustmentPaise: 0,
      totalDuePaise: membership.monthlyFeePaise,
      totalPaidPaise: 0,
      dueDate,
      status: 'ISSUED',
    },
    include: {
      membership: {
        include: {
          user: true,
          plan: true,
        },
      },
    },
  });
}

/**
 * Apply discount or fee adjustment (Admin only).
 */
export async function applyFeeAdjustment(adminId: string, input: FeeAdjustmentInput) {
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: input.invoiceId },
  });

  if (!invoice) {
    throw AppError.notFound('Invoice not found');
  }

  const newAdjustment = invoice.adjustmentPaise + input.adjustmentPaise;
  const newTotalDue = Math.max(0, invoice.amountPaise - newAdjustment);
  const newStatus =
    invoice.totalPaidPaise >= newTotalDue
      ? 'PAID'
      : invoice.totalPaidPaise > 0
      ? 'PARTIALLY_PAID'
      : invoice.status;

  const [adjustment, updatedInvoice] = await prisma.$transaction([
    prisma.feeAdjustment.create({
      data: {
        invoiceId: input.invoiceId,
        adjustmentPaise: input.adjustmentPaise,
        reason: input.reason,
        authorizedById: adminId,
      },
    }),
    prisma.feeInvoice.update({
      where: { id: input.invoiceId },
      data: {
        adjustmentPaise: newAdjustment,
        totalDuePaise: newTotalDue,
        status: newStatus,
      },
    }),
  ]);

  return { adjustment, invoice: updatedInvoice };
}

/**
 * Get invoices for a user.
 */
export async function getUserInvoices(userId: string) {
  return prisma.feeInvoice.findMany({
    where: {
      membership: { userId },
    },
    include: {
      feePayments: true,
      adjustments: true,
      membership: {
        include: { plan: true },
      },
    },
    orderBy: { billingMonth: 'desc' },
  });
}

/**
 * Get all invoices with filters for admin dashboard.
 */
export async function getAllInvoices(options: {
  status?: string;
  billingMonth?: string;
  page?: number;
  limit?: number;
} = {}) {
  const { status, billingMonth, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (billingMonth) where.billingMonth = billingMonth;

  const [invoices, total] = await Promise.all([
    prisma.feeInvoice.findMany({
      where,
      include: {
        membership: {
          include: {
            user: { select: { id: true, name: true, contacts: true } },
            plan: true,
          },
        },
        feePayments: true,
        adjustments: true,
      },
      orderBy: { dueDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.feeInvoice.count({ where }),
  ]);

  return {
    invoices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
