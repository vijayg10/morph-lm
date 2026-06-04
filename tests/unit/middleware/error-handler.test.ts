import { describe, it, expect, vi } from 'vitest';
import { errorHandlerMiddleware } from '../../../src/api/middleware/error-handler.middleware.js';
import { AppError } from '../../../src/types/common.types.js';
import type { Request, Response, NextFunction } from 'express';

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('errorHandlerMiddleware', () => {
  const req = { requestId: 'test-id' } as Request;
  const next = vi.fn() as NextFunction;

  it('returns structured error for AppError', () => {
    const res = mockRes();
    const err = new AppError('AGENT_NOT_FOUND', 'Model not found');
    errorHandlerMiddleware(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'AGENT_NOT_FOUND' }),
    }));
  });

  it('returns 500 for unknown errors', () => {
    const res = mockRes();
    errorHandlerMiddleware(new Error('oops'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
    }));
  });
});
