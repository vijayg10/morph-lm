import { Router } from 'express';
import { OpenAIController } from '../controllers/openai.controller.js';
import type { AgentRegistry } from '../../agents/registry/agent-registry.js';
import type { SessionStore } from '../../sessions/session.interface.js';
import type { Config } from '../../config/config.js';

export function createOpenAIRouter(
  registry: AgentRegistry,
  sessionStore: SessionStore,
  config?: Config,
): Router {
  const router = Router();
  // config may be injected; if not provided, use a placeholder (tests override)
  const ctrl = new OpenAIController(
    registry,
    sessionStore,
    config ?? ({ WORKSPACES: [] } as unknown as Config),
  );

  router.get('/v1/models', ctrl.listModels);
  router.post('/v1/chat/completions', ctrl.createChatCompletion);

  return router;
}
