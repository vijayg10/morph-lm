import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../types/common.types.js';
import { getLogger } from '../../telemetry/logger.js';

const ERROR_TYPE_MAP: Record<string, string> = {
  AGENT_NOT_FOUND: 'not_found_error',
  AGENT_UNAVAILABLE: 'service_unavailable_error',
  AGENT_TIMEOUT: 'timeout_error',
  AGENT_EXECUTION_FAILED: 'server_error',
  AGENT_CONCURRENCY_LIMIT: 'service_unavailable_error',
  VALIDATION_ERROR: 'invalid_request_error',
  UNAUTHORIZED: 'authentication_error',
  WORKSPACE_FORBIDDEN: 'permission_error',
  SESSION_NOT_FOUND: 'not_found_error',
  INTERNAL_ERROR: 'server_error',
  RATE_LIMITED: 'rate_limit_error',
};

export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const logger = getLogger();

  if (err instanceof AppError) {
    logger.warn({ requestId: req.requestId, code: err.code, message: err.message }, 'App error');
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        type: ERROR_TYPE_MAP[err.code] ?? 'server_error',
        param: null,
      },
    });
    return;
  }

  logger.error({ requestId: req.requestId, err }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      type: 'server_error',
      param: null,
    },
  });
}
