import { describe, it, expect } from 'vitest';
import {
  serializeModels,
  serializeChatCompletion,
  serializeChunk,
  serializeFinalChunk,
} from '../../../src/api/serializers/openai.serializer.js';

describe('serializeModels', () => {
  it('returns a list object with model entries', () => {
    const result = serializeModels(['gemini:mlm', 'claude:mlm']);
    expect(result.object).toBe('list');
    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe('gemini:mlm');
    expect(result.data[0].object).toBe('model');
    expect(result.data[0].owned_by).toBe('morph-lm');
  });
});

describe('serializeChatCompletion', () => {
  it('returns a chat.completion object', () => {
    const result = serializeChatCompletion({ content: 'hello', model: 'gemini:mlm', done: true, durationMs: 100 });
    expect(result.object).toBe('chat.completion');
    expect(result.choices).toHaveLength(1);
    expect(result.choices[0].message.content).toBe('hello');
    expect(result.choices[0].message.role).toBe('assistant');
    expect(result.choices[0].finish_reason).toBe('stop');
    expect(result.model).toBe('gemini:mlm');
  });
});

describe('serializeChunk', () => {
  it('returns SSE formatted string', () => {
    const line = serializeChunk('id1', 'gemini:mlm', 'hello');
    expect(line.startsWith('data: ')).toBe(true);
    expect(line.endsWith('\n\n')).toBe(true);
    const json = JSON.parse(line.slice(6));
    expect(json.choices[0].delta.content).toBe('hello');
  });

  it('first chunk includes role', () => {
    const line = serializeChunk('id1', 'gemini:mlm', '', true);
    const json = JSON.parse(line.slice(6));
    expect(json.choices[0].delta.role).toBe('assistant');
  });
});

describe('serializeFinalChunk', () => {
  it('ends with DONE sentinel', () => {
    const line = serializeFinalChunk('id1', 'gemini:mlm');
    expect(line.includes('data: [DONE]')).toBe(true);
    expect(line.includes('"finish_reason":"stop"')).toBe(true);
  });
});
