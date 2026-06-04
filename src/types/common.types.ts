export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  workspace?: string | null;
  sessionId?: string | null;
  stream?: boolean;
}

export interface AgentResponse {
  content: string;
  model: string;
  done: boolean;
  durationMs: number;
}

export type ErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'AGENT_UNAVAILABLE'
  | 'AGENT_TIMEOUT'
  | 'AGENT_EXECUTION_FAILED'
  | 'AGENT_CONCURRENCY_LIMIT'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'WORKSPACE_FORBIDDEN'
  | 'FORBIDDEN'
  | 'SESSION_NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED';

export const ERROR_STATUS: Record<ErrorCode, number> = {
  AGENT_NOT_FOUND: 404,
  AGENT_UNAVAILABLE: 503,
  AGENT_TIMEOUT: 504,
  AGENT_EXECUTION_FAILED: 502,
  AGENT_CONCURRENCY_LIMIT: 503,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  WORKSPACE_FORBIDDEN: 403,
  FORBIDDEN: 403,
  SESSION_NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
  RATE_LIMITED: 429,
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  get statusCode(): number {
    return ERROR_STATUS[this.code];
  }
}
