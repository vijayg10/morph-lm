import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp as pinoHttpMiddleware } from 'pino-http';
import { requestIdMiddleware } from './api/middleware/request-id.middleware.js';
import { createAuthMiddleware } from './api/middleware/auth.middleware.js';
import { createRateLimitMiddleware } from './api/middleware/rate-limit.middleware.js';
import { errorHandlerMiddleware } from './api/middleware/error-handler.middleware.js';
import { createHealthRouter } from './api/routes/health.routes.js';
import { createOpenAIRouter } from './api/routes/openai.routes.js';
import { createSessionRouter } from './api/routes/session.routes.js';
import { getLogger } from './telemetry/logger.js';
import type { Config } from './config/config.js';
import type { AgentRegistry } from './agents/registry/agent-registry.js';
import type { SessionStore } from './sessions/session.interface.js';

export function createApp(config: Config, registry: AgentRegistry, sessionStore: SessionStore) {
  const app = express();
  const logger = getLogger();

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(requestIdMiddleware);
  const httpLogger = pinoHttpMiddleware({
    logger,
    customProps: (req: express.Request) => ({ requestId: req.requestId }),
  });
  app.use(httpLogger);

  // Health endpoints — no auth required
  app.use(createHealthRouter());

  // Auth + rate limiting for API endpoints
  app.use(createAuthMiddleware(config.API_KEY));
  app.use(createRateLimitMiddleware(config.RATE_LIMIT_WINDOW_MS, config.RATE_LIMIT_MAX));

  // API routes
  app.use(createOpenAIRouter(registry, sessionStore, config));
  app.use(createSessionRouter(sessionStore));

  app.use(errorHandlerMiddleware);

  return app;
}
