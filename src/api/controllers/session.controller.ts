import type { Request, Response, NextFunction } from 'express';
import { CreateSessionSchema, SessionIdSchema } from '../validators/session.schemas.js';
import { AppError } from '../../types/common.types.js';
import type { SessionStore } from '../../sessions/session.interface.js';

export class SessionController {
  constructor(private readonly sessionStore: SessionStore) {}

  createSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CreateSessionSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        const msg = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new AppError('VALIDATION_ERROR', msg);
      }
      const session = await this.sessionStore.create(parsed.data.agent_name);
      res.status(201).json({ id: session.id, agent_name: session.agentName, created_at: session.createdAt });
    } catch (err) {
      next(err);
    }
  };

  getSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = SessionIdSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid session id');
      const session = await this.sessionStore.get(parsed.data.id);
      if (!session) throw new AppError('SESSION_NOT_FOUND', `Session '${parsed.data.id}' not found`);
      res.json({
        id: session.id,
        agent_name: session.agentName,
        messages: session.messages,
        created_at: session.createdAt,
        updated_at: session.updatedAt,
      });
    } catch (err) {
      next(err);
    }
  };

  deleteSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = SessionIdSchema.safeParse(req.params);
      if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid session id');
      const deleted = await this.sessionStore.delete(parsed.data.id);
      if (!deleted) throw new AppError('SESSION_NOT_FOUND', `Session '${parsed.data.id}' not found`);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
