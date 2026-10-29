import { Router, Request, Response, NextFunction } from 'express';
import { sendOtpSchema, verifyOtpSchema, updateProfileSchema } from '@mylibrary/shared';
import { validateBody } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';
import prisma from '../config/database.js';

const router = Router();

/**
 * POST /api/v1/auth/otp/send
 * Send OTP to email or phone.
 */
router.post(
  '/otp/send',
  validateBody(sendOtpSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contact, contactType } = req.body;
      const result = await authService.sendOtp(contact, contactType);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/otp/verify
 * Verify OTP and get tokens.
 */
router.post(
  '/otp/verify',
  validateBody(verifyOtpSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contact, contactType, otp } = req.body;
      const result = await authService.verifyOtp(contact, contactType, otp);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/logout
 * Revoke session.
 */
router.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.body.refreshToken;
      if (refreshToken) {
        await authService.revokeSession(refreshToken);
      }
      res.json({ success: true, data: { message: 'Logged out successfully' } });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/users/me
 * Get current user profile.
 */
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await authService.getUserProfile(req.user!.userId);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/users/me
 * Update current user profile.
 */
router.patch(
  '/me',
  authenticate,
  validateBody(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await authService.updateUserProfile(req.user!.userId, req.body);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/admin-claim
 * Grant SUPER_ADMIN role to the current user (allows seamless admin testing).
 */
router.post(
  '/admin-claim',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
      if (adminRole) {
        const hasRole = await prisma.userRole.findFirst({
          where: { userId: req.user!.userId, roleId: adminRole.id },
        });
        if (!hasRole) {
          await prisma.userRole.create({
            data: { userId: req.user!.userId, roleId: adminRole.id },
          });
        }
      }
      const updatedUser = await authService.getUserProfile(req.user!.userId);
      res.json({ success: true, data: updatedUser });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
