import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../types/common.types.js';

export function createAuthMiddleware(apiKey: string) {
  return function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('UNAUTHORIZED', 'Missing or invalid API key'));
    }
    const token = authHeader.slice(7);
    if (token !== apiKey) {
      return next(new AppError('UNAUTHORIZED', 'Missing or invalid API key'));
    }
    next();
  };
}
