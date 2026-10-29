import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, string[]>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: Record<string, string[]>) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(entity = 'Resource') {
    return new AppError(404, 'NOT_FOUND', `${entity} not found`);
  }

  static conflict(message: string) {
    return new AppError(409, 'CONFLICT', message);
  }

  static tooManyRequests(message = 'Too many requests, please try again later') {
    return new AppError(429, 'TOO_MANY_REQUESTS', message);
  }

  static internal(message = 'An unexpected error occurred') {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Prisma known error handling
  if ((err as any).code === 'P2002') {
    res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'A record with these values already exists',
      },
    });
    return;
  }

  if ((err as any).code === 'P2025') {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested record was not found',
      },
    });
    return;
  }

  // Log unexpected errors (never expose details to client)
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
