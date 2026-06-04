import { z } from 'zod';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

export const ChatCompletionRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(MessageSchema).min(1),
  stream: z.boolean().optional().default(false),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().nullable().optional(),
  workspace: z.string().optional(),
  session_id: z.string().uuid().optional(),
});

export type ValidatedChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;
