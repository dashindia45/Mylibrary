import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import prisma from '../config/database.js';
import { AppError } from './errorHandler.js';

export interface AuthPayload {
  userId: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Verify JWT access token from Authorization header.
 * Attaches user payload to req.user.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, config.jwt.accessSecret) as AuthPayload;

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized('Access token has expired'));
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      next(AppError.unauthorized('Invalid access token'));
      return;
    }
    next(err);
  }
}

/**
 * Optional authentication — sets req.user if token present, otherwise continues.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, config.jwt.accessSecret) as AuthPayload;
    req.user = payload;
  } catch {
    // Token invalid — continue without auth
  }
  next();
}

/**
 * Require specific roles. Must be used after authenticate middleware.
 */
export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }

    const hasRole = req.user.roles.some((r) => roles.includes(r));
    if (!hasRole) {
      next(AppError.forbidden());
      return;
    }

    next();
  };
}

/**
 * Require any admin role.
 */
export const requireAdmin = requireRoles('SUPER_ADMIN', 'LIBRARY_MANAGER');

/**
 * Require any staff role (including admin).
 */
export const requireStaff = requireRoles(
  'SUPER_ADMIN',
  'LIBRARY_MANAGER',
  'RECEPTION_STAFF',
  'SUPPORT_STAFF'
);

/**
 * Generate access and refresh tokens for a user.
 */
export async function generateTokens(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: string;
}> {
  // Load roles
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  const roles = userRoles.map((ur) => ur.role.name);

  const payload: AuthPayload = { userId, roles };

  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry as any,
  });

  const refreshToken = jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry as any,
  });

  // Store refresh token in DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.session.create({
    data: {
      userId,
      refreshToken,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    accessExpiresIn: config.jwt.accessExpiry,
  };
}
