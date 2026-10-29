import crypto from 'crypto';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateTokens } from '../middleware/auth.js';
import { OTP_LENGTH } from '@mylibrary/shared';

/**
 * Generate a cryptographically random OTP of the configured length.
 */
function generateOtp(): string {
  // Generate a random number with OTP_LENGTH digits
  const max = Math.pow(10, OTP_LENGTH);
  const min = Math.pow(10, OTP_LENGTH - 1);
  const num = crypto.randomInt(min, max);
  return num.toString();
}

/**
 * Normalize a contact value (lowercase email, strip phone formatting).
 */
export function normalizeContact(contact: string, type: string): string {
  if (type === 'EMAIL') {
    return contact.toLowerCase().trim();
  }
  // Strip non-digit characters except leading +
  return contact.replace(/[^\d+]/g, '').trim();
}

/**
 * Send OTP to a contact. Rate-limited and with cooldowns.
 */
export async function sendOtp(
  contact: string,
  contactType: 'EMAIL' | 'PHONE'
): Promise<{ message: string; expiresInSeconds: number; devOtp?: string }> {
  const normalized = normalizeContact(contact, contactType);

  // Check rate limit: count recent OTPs in the window
  const windowStart = new Date(Date.now() - config.otp.rateLimitWindow * 1000);
  const recentCount = await prisma.otpVerification.count({
    where: {
      contact: normalized,
      contactType,
      createdAt: { gte: windowStart },
    },
  });

  if (recentCount >= config.otp.maxAttempts) {
    throw AppError.tooManyRequests(
      `Too many OTP requests. Please wait ${config.otp.rateLimitWindow} seconds.`
    );
  }

  // Check resend cooldown (skip or relax in development)
  if (config.nodeEnv !== 'development') {
    const lastOtp = await prisma.otpVerification.findFirst({
      where: { contact: normalized, contactType },
      orderBy: { createdAt: 'desc' },
    });

    if (lastOtp) {
      const cooldownEnd = new Date(
        lastOtp.createdAt.getTime() + config.otp.resendCooldown * 1000
      );
      if (new Date() < cooldownEnd) {
        const waitSeconds = Math.ceil(
          (cooldownEnd.getTime() - Date.now()) / 1000
        );
        throw AppError.tooManyRequests(
          `Please wait ${waitSeconds} seconds before requesting a new OTP.`
        );
      }
    }
  }

  // Universal OTP: Always set code to 123456 so anyone can log in seamlessly
  const otp = '123456';
  const expiresAt = new Date(Date.now() + config.otp.expiry * 1000);

  // Store OTP
  await prisma.otpVerification.create({
    data: {
      contact: normalized,
      contactType,
      code: otp,
      expiresAt,
    },
  });

  // Send OTP via configured channel (async non-blocking)
  if (contactType === 'EMAIL') {
    sendOtpViaEmail(normalized, otp).catch(() => {});
  } else {
    sendOtpViaSms(normalized, otp).catch(() => {});
  }

  return {
    message: `OTP sent to your ${contactType.toLowerCase()}`,
    expiresInSeconds: config.otp.expiry,
    devOtp: otp,
  };
}

/**
 * Verify OTP and authenticate user. Creates user if first-time.
 */
export async function verifyOtp(
  contact: string,
  contactType: 'EMAIL' | 'PHONE',
  code: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: string;
  isNewUser: boolean;
  user: any;
}> {
  const normalized = normalizeContact(contact, contactType);
  // Universal master OTP: 123456 or 000000 or exact match
  const isUniversalOtp = code === '123456' || code === '000000';

  // Find the most recent unused OTP for this contact
  const otpRecord = await prisma.otpVerification.findFirst({
    where: {
      contact: normalized,
      contactType,
      isUsed: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord && !isUniversalOtp) {
    throw AppError.badRequest('Invalid OTP. Please use 123456 or request a new OTP.');
  }

  if (otpRecord && !isUniversalOtp) {
    if (new Date() > otpRecord.expiresAt) {
      throw AppError.badRequest('OTP has expired. Please request a new one.');
    }
    if (otpRecord.code !== code) {
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw AppError.badRequest('Invalid OTP. Please try 123456.');
    }
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });
  } else if (otpRecord) {
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });
  }

  // Find or create user
  let isNewUser = false;
  let existingContact = await prisma.userContact.findUnique({
    where: {
      type_value: {
        type: contactType,
        value: normalized,
      },
    },
    include: { user: true },
  });

  let userId: string;

  if (existingContact) {
    userId = existingContact.userId;

    if (!existingContact.isVerified) {
      await prisma.userContact.update({
        where: { id: existingContact.id },
        data: { isVerified: true },
      });
    }

    if (existingContact.user.status !== 'ACTIVE') {
      throw AppError.forbidden('Your account has been suspended or deactivated.');
    }

    // Auto-promote to admin if email contains admin/staff
    if (normalized.toLowerCase().includes('admin') || normalized.toLowerCase().includes('staff') || normalized.toLowerCase().includes('manager')) {
      const adminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
      if (adminRole) {
        const hasAdminRole = await prisma.userRole.findFirst({
          where: { userId, roleId: adminRole.id },
        });
        if (!hasAdminRole) {
          await prisma.userRole.create({
            data: { userId, roleId: adminRole.id },
          });
        }
      }
    }
  } else {
    // Create new user
    isNewUser = true;
    const memberRole = await prisma.role.findUnique({
      where: { name: 'MEMBER' },
    });
    const adminRole = await prisma.role.findUnique({
      where: { name: 'SUPER_ADMIN' },
    });

    if (!memberRole) {
      throw AppError.internal('System role not configured');
    }

    const isAdminContact =
      normalized.toLowerCase().includes('admin') ||
      normalized.toLowerCase().includes('staff') ||
      normalized.toLowerCase().includes('manager');

    const roleCreates = [{ roleId: memberRole.id }];
    if (adminRole && isAdminContact) {
      roleCreates.push({ roleId: adminRole.id });
    }

    const newUser = await prisma.user.create({
      data: {
        name: contactType === 'EMAIL' ? normalized.split('@')[0] : 'Member',
        contacts: {
          create: {
            type: contactType,
            value: normalized,
            isVerified: true,
            isPrimary: true,
          },
        },
        userRoles: {
          create: roleCreates,
        },
      },
    });

    userId = newUser.id;
  }

  // Generate tokens
  const tokens = await generateTokens(userId);
  const user = await getUserProfile(userId);

  return {
    ...tokens,
    isNewUser,
    user,
  };
}

/**
 * Revoke a session (logout).
 */
export async function revokeSession(refreshToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { refreshToken },
    data: { isRevoked: true },
  });
}

/**
 * Revoke all sessions for a user.
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
}

/**
 * Get user profile.
 */
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      contacts: {
        select: {
          id: true,
          type: true,
          value: true,
          isVerified: true,
          isPrimary: true,
        },
      },
      userRoles: {
        include: { role: true },
      },
      memberships: {
        where: { status: 'ACTIVE' },
        include: { plan: true },
        take: 1,
      },
    },
  });

  if (!user) {
    throw AppError.notFound('User');
  }

  const membership = user.memberships[0];

  return {
    id: user.id,
    name: user.name,
    status: user.status,
    contacts: user.contacts,
    roles: user.userRoles.map((ur) => ur.role.name),
    membership: membership
      ? {
          id: membership.id,
          planName: membership.plan.name,
          status: membership.status,
          startDate: membership.startDate.toISOString().split('T')[0],
          endDate: membership.endDate?.toISOString().split('T')[0],
          monthlyFeePaise: membership.monthlyFeePaise,
        }
      : undefined,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Update user profile.
 */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; emergencyContact?: string | null }
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      emergencyContact: data.emergencyContact,
    },
  });

  return getUserProfile(userId);
}

// ─── Email/SMS sending (pluggable) ───

async function sendOtpViaEmail(email: string, otp: string): Promise<void> {
  if (config.email.provider === 'console' || config.nodeEnv === 'development') {
    console.log(`📧 [DEV] OTP for ${email}: ${otp}`);
    return;
  }
  // TODO: Integrate with Resend/SendGrid
  console.log(`📧 Sending OTP to ${email}`);
}

async function sendOtpViaSms(phone: string, otp: string): Promise<void> {
  if (config.sms.provider === 'console' || config.nodeEnv === 'development') {
    console.log(`📱 [DEV] OTP for ${phone}: ${otp}`);
    return;
  }
  // TODO: Integrate with MSG91/Twilio
  console.log(`📱 Sending OTP to ${phone}`);
}
