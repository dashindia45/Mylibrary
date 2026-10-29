import prisma from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CreateAnnouncementInput } from '@mylibrary/shared';

/**
 * Get published announcements for user.
 */
export async function getActiveAnnouncements(userId?: string) {
  const announcements = await prisma.announcement.findMany({
    where: {
      isPublished: true,
      OR: [
        { publishedAt: null },
        { publishedAt: { lte: new Date() } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: userId
      ? {
          reads: {
            where: { userId },
          },
        }
      : undefined,
  });

  return announcements.map((a: any) => ({
    ...a,
    isRead: userId ? a.reads && a.reads.length > 0 : false,
  }));
}

/**
 * Mark announcement as read by user.
 */
export async function markAnnouncementRead(userId: string, announcementId: string) {
  return prisma.announcementRead.upsert({
    where: {
      announcementId_userId: {
        announcementId,
        userId,
      },
    },
    update: {},
    create: {
      announcementId,
      userId,
    },
  });
}

/**
 * Admin create announcement.
 */
export async function createAnnouncement(adminId: string, input: CreateAnnouncementInput) {
  return prisma.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      targetAudience: input.targetAudience || 'ALL',
      isPublished: true,
      publishedAt: input.publishAt ? new Date(input.publishAt) : new Date(),
      createdById: adminId,
    },
  });
}

/**
 * Admin update or delete announcement.
 */
export async function deleteAnnouncement(announcementId: string) {
  return prisma.announcement.delete({
    where: { id: announcementId },
  });
}
