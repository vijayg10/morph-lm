import { Router } from 'express';
import { SessionController } from '../controllers/session.controller.js';
import type { SessionStore } from '../../sessions/session.interface.js';

export function createSessionRouter(sessionStore: SessionStore): Router {
  const router = Router();
  const ctrl = new SessionController(sessionStore);

  router.post('/v1/sessions', ctrl.createSession);
  router.get('/v1/sessions/:id', ctrl.getSession);
  router.delete('/v1/sessions/:id', ctrl.deleteSession);

  return router;
}
