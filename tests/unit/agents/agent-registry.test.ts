import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentRegistry } from '../../../src/agents/registry/agent-registry.js';
import { AppError } from '../../../src/types/common.types.js';
import type { AgentAdapter } from '../../../src/agents/base/agent-adapter.interface.js';

function mockAdapter(name: string, available = true): AgentAdapter {
  return {
    name,
    chat: vi.fn(),
    streamChat: vi.fn(),
    checkAvailability: vi.fn().mockResolvedValue(available),
  };
}

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it('registers and retrieves available adapter', async () => {
    const adapter = mockAdapter('test-agent');
    registry.register(adapter);
    await registry.validateAll();
    expect(registry.get('test-agent')).toBe(adapter);
  });

  it('throws AGENT_NOT_FOUND for unknown model', () => {
    expect(() => registry.get('unknown')).toThrow(AppError);
    expect(() => registry.get('unknown')).toThrow(expect.objectContaining({ code: 'AGENT_NOT_FOUND' }));
  });

  it('throws AGENT_UNAVAILABLE for unavailable agent', async () => {
    registry.register(mockAdapter('bad-agent', false));
    await registry.validateAll();
    expect(() => registry.get('bad-agent')).toThrow(expect.objectContaining({ code: 'AGENT_UNAVAILABLE' }));
  });

  it('listAvailable returns only available agents', async () => {
    registry.register(mockAdapter('good', true));
    registry.register(mockAdapter('bad', false));
    await registry.validateAll();
    const available = registry.listAvailable();
    expect(available).toHaveLength(1);
    expect(available[0].name).toBe('good');
  });

  it('validateAll returns availability map', async () => {
    registry.register(mockAdapter('a', true));
    registry.register(mockAdapter('b', false));
    const result = await registry.validateAll();
    expect(result.get('a')).toBe(true);
    expect(result.get('b')).toBe(false);
  });
});
