import { describe, it, expect, vi } from 'vitest';
import { createAuthMiddleware } from '../../../src/api/middleware/auth.middleware.js';
import { AppError } from '../../../src/types/common.types.js';
import type { Request, Response, NextFunction } from 'express';

function mockReq(authHeader?: string): Partial<Request> {
  return { headers: { authorization: authHeader } } as Partial<Request>;
}

describe('authMiddleware', () => {
  const apiKey = 'test-key-123';
  const middleware = createAuthMiddleware(apiKey);

  it('calls next() with valid Bearer token', () => {
    const next = vi.fn() as NextFunction;
    middleware(mockReq(`Bearer ${apiKey}`) as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(AppError) when no header', () => {
    const next = vi.fn() as NextFunction;
    middleware(mockReq() as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).code).toBe('UNAUTHORIZED');
  });

  it('calls next(AppError) with wrong token', () => {
    const next = vi.fn() as NextFunction;
    middleware(mockReq('Bearer wrong-key') as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('calls next(AppError) without Bearer prefix', () => {
    const next = vi.fn() as NextFunction;
    middleware(mockReq(apiKey) as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });
});
