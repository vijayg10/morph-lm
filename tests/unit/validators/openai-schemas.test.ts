import { describe, it, expect } from 'vitest';
import { ChatCompletionRequestSchema } from '../../../src/api/validators/openai.schemas.js';

describe('ChatCompletionRequestSchema', () => {
  it('validates a minimal valid request', () => {
    const result = ChatCompletionRequestSchema.safeParse({
      model: 'gemini-cli',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(result.success).toBe(true);
  });

  it('defaults stream to false', () => {
    const result = ChatCompletionRequestSchema.safeParse({
      model: 'gemini-cli',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(result.success && result.data.stream).toBe(false);
  });

  it('rejects empty model', () => {
    const result = ChatCompletionRequestSchema.safeParse({
      model: '',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty messages', () => {
    const result = ChatCompletionRequestSchema.safeParse({ model: 'gemini-cli', messages: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = ChatCompletionRequestSchema.safeParse({
      model: 'gemini-cli',
      messages: [{ role: 'bot', content: 'hello' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional workspace and session_id', () => {
    const result = ChatCompletionRequestSchema.safeParse({
      model: 'gemini-cli',
      messages: [{ role: 'user', content: 'hello' }],
      workspace: '/repos/project',
      session_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });
});
