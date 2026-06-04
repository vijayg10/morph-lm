import { z } from 'zod';

export const CreateSessionSchema = z.object({
  agent_name: z.string().optional(),
});

export const SessionIdSchema = z.object({
  id: z.string().uuid(),
});
