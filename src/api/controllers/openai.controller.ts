import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ChatCompletionRequestSchema } from '../validators/openai.schemas.js';
import {
  serializeModels,
  serializeChatCompletion,
  serializeChunk,
  serializeFinalChunk,
} from '../serializers/openai.serializer.js';
import { AppError } from '../../types/common.types.js';
import { validateWorkspace } from '../../utils/workspace-validator.js';
import type { AgentRegistry } from '../../agents/registry/agent-registry.js';
import type { SessionStore } from '../../sessions/session.interface.js';
import type { Config } from '../../config/config.js';
import { httpRequestsTotal, httpRequestDuration } from '../../telemetry/metrics.js';

export class OpenAIController {
  constructor(
    private readonly registry: AgentRegistry,
    private readonly sessionStore: SessionStore,
    private readonly config: Config,
  ) {}

  listModels = (_req: Request, res: Response): void => {
    const available = this.registry.listAvailable().map((e) => e.name);
    res.json(serializeModels(available));
  };

  createChatCompletion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const timer = httpRequestDuration.labels('POST', '/v1/chat/completions').startTimer();
    try {
      const parsed = ChatCompletionRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new AppError('VALIDATION_ERROR', msg);
      }

      const { model, messages, stream, workspace, session_id } = parsed.data;

      // Workspace validation
      if (workspace) {
        validateWorkspace(workspace, this.config.WORKSPACES);
      }

      // Load session context if provided
      let allMessages = messages;
      if (session_id) {
        const session = await this.sessionStore.get(session_id);
        if (!session) throw new AppError('SESSION_NOT_FOUND', `Session '${session_id}' not found`);
        allMessages = [...session.messages, ...messages];
      }

      const adapter = this.registry.get(model);
      const chatRequest = { model, messages: allMessages, workspace: workspace ?? null, stream: stream ?? false };

      if (stream) {
        const id = `chatcmpl-${uuidv4().replace(/-/g, '').slice(0, 12)}`;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(serializeChunk(id, model, '', true));

        let fullContent = '';
        for await (const chunk of adapter.streamChat(chatRequest)) {
          if (chunk) {
            fullContent += chunk;
            res.write(serializeChunk(id, model, chunk));
          }
        }
        res.write(serializeFinalChunk(id, model));
        res.end();

        // Persist to session if provided
        if (session_id) {
          for (const m of messages) await this.sessionStore.addMessage(session_id, m);
          await this.sessionStore.addMessage(session_id, { role: 'assistant', content: fullContent });
        }
      } else {
        const response = await adapter.chat(chatRequest);
        const completion = serializeChatCompletion(response);

        if (session_id) {
          for (const m of messages) await this.sessionStore.addMessage(session_id, m);
          await this.sessionStore.addMessage(session_id, { role: 'assistant', content: response.content });
        }

        res.json(completion);
      }

      httpRequestsTotal.labels('POST', '/v1/chat/completions', '200').inc();
    } catch (err) {
      httpRequestsTotal.labels('POST', '/v1/chat/completions', 'error').inc();
      next(err);
    } finally {
      timer();
    }
  };
}
