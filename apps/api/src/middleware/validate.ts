import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler.js';

/**
 * Validate request body against a Zod schema.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const path = issue.path.join('.');
          if (!details[path]) details[path] = [];
          details[path].push(issue.message);
        }
        next(AppError.badRequest('Validation failed', details));
        return;
      }
      next(err);
    }
  };
}

/**
 * Validate request query params against a Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const path = issue.path.join('.');
          if (!details[path]) details[path] = [];
          details[path].push(issue.message);
        }
        next(AppError.badRequest('Invalid query parameters', details));
        return;
      }
      next(err);
    }
  };
}

/**
 * Validate request params (URL path params) against a Zod schema.
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const path = issue.path.join('.');
          if (!details[path]) details[path] = [];
          details[path].push(issue.message);
        }
        next(AppError.badRequest('Invalid URL parameters', details));
        return;
      }
      next(err);
    }
  };
}
