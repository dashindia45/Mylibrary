import prisma from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CreateComplaintInput, ComplaintMessageInput } from '@mylibrary/shared';

/**
 * Create a new complaint.
 */
export async function createComplaint(userId: string, input: CreateComplaintInput) {
  const complaint = await prisma.complaint.create({
    data: {
      userId,
      category: input.category,
      severity: input.severity || 'MEDIUM',
      status: 'OPEN',
      subject: input.subject,
      description: input.description,
      messages: {
        create: {
          senderId: userId,
          message: input.description,
          isInternal: false,
        },
      },
    },
    include: {
      messages: { include: { sender: { select: { id: true, name: true } } } },
    },
  });

  return complaint;
}

/**
 * Get complaints created by a specific user.
 */
export async function getUserComplaints(userId: string) {
  return prisma.complaint.findMany({
    where: { userId },
    include: {
      messages: {
        where: { isInternal: false }, // Don't expose internal staff notes to members
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get complaint details by ID.
 */
export async function getComplaintById(complaintId: string, userId: string, isAdmin = false) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: {
      user: { select: { id: true, name: true } },
      messages: {
        where: isAdmin ? undefined : { isInternal: false },
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id: true, name: true } } },
      },
      assignments: {
        include: { staff: { select: { id: true, name: true } } },
      },
    },
  });

  if (!complaint) {
    throw AppError.notFound('Complaint not found');
  }

  if (!isAdmin && complaint.userId !== userId) {
    throw AppError.forbidden('Unauthorized access to complaint');
  }

  return complaint;
}

/**
 * Add a message to a complaint thread.
 */
export async function addComplaintMessage(
  complaintId: string,
  senderId: string,
  input: ComplaintMessageInput,
  isAdmin = false
) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });

  if (!complaint) {
    throw AppError.notFound('Complaint not found');
  }

  if (!isAdmin && complaint.userId !== senderId) {
    throw AppError.forbidden('Unauthorized');
  }

  // Non-staff cannot post internal notes
  const isInternal = isAdmin ? (input.isInternal || false) : false;

  const message = await prisma.complaintMessage.create({
    data: {
      complaintId,
      senderId,
      message: input.message,
      isInternal,
    },
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  // If complaint was resolved and member replies, reopen it
  if (!isAdmin && complaint.status === 'RESOLVED') {
    await prisma.complaint.update({
      where: { id: complaintId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  return message;
}

/**
 * Update complaint status or assignment (Admin).
 */
export async function updateComplaintStatus(
  complaintId: string,
  status: string,
  assignedStaffId?: string
) {
  const data: any = { status };
  if (status === 'RESOLVED') {
    data.resolvedAt = new Date();
  }

  if (assignedStaffId) {
    await prisma.complaintAssignment.create({
      data: {
        complaintId,
        staffId: assignedStaffId,
      },
    });
  }

  return prisma.complaint.update({
    where: { id: complaintId },
    data,
    include: {
      user: { select: { id: true, name: true } },
      assignments: { include: { staff: { select: { id: true, name: true } } } },
    },
  });
}

/**
 * Get all complaints for admin view.
 */
export async function getAllComplaints(options: {
  status?: string;
  category?: string;
  severity?: string;
  page?: number;
  limit?: number;
} = {}) {
  const { status, category, severity, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (severity) where.severity = severity;

  const [complaints, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, contacts: true } },
        assignments: { include: { staff: { select: { id: true, name: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.complaint.count({ where }),
  ]);

  return {
    complaints,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
