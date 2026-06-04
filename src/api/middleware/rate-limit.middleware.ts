import rateLimit from 'express-rate-limit';
import { AppError } from '../../types/common.types.js';

export function createRateLimitMiddleware(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new AppError('RATE_LIMITED', 'Too many requests, please try again later'));
    },
  });
}
