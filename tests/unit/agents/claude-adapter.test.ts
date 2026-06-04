import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeAdapter } from '../../../src/agents/claude/claude.adapter.js';

vi.mock('../../../src/utils/which.js', () => ({ which: vi.fn().mockResolvedValue(true) }));
vi.mock('../../../src/agents/base/agent-process.js', () => ({
  runProcess: vi.fn().mockResolvedValue({ output: 'claude response', exitCode: 0 }),
  streamProcess: async function* () { yield 'clau'; yield 'de'; },
}));
vi.mock('../../../src/telemetry/metrics.js', () => ({
  agentActiveProcesses: { labels: () => ({ inc: vi.fn(), dec: vi.fn() }) },
  agentExecutionsTotal: { labels: () => ({ inc: vi.fn() }) },
  agentExecutionDuration: { labels: () => ({ observe: vi.fn() }) },
}));

describe('ClaudeAdapter', () => {
  let adapter: ClaudeAdapter;
  beforeEach(() => { adapter = new ClaudeAdapter(30000, 5); });

  it('reports name as claude-code', () => {
    expect(adapter.name).toBe('claude-code');
  });

  it('chat returns AgentResponse', async () => {
    const result = await adapter.chat({
      model: 'claude-code',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(result.content).toBe('claude response');
    expect(result.model).toBe('claude-code');
  });

  it('streamChat yields chunks', async () => {
    const chunks: string[] = [];
    for await (const c of adapter.streamChat({
      model: 'claude-code',
      messages: [{ role: 'user', content: 'hello' }],
    })) {
      chunks.push(c);
    }
    expect(chunks).toEqual(['clau', 'de']);
  });
});
