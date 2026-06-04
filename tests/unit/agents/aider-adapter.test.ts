import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiderAdapter } from '../../../src/agents/aider/aider.adapter.js';

vi.mock('../../../src/utils/which.js', () => ({ which: vi.fn().mockResolvedValue(true) }));
vi.mock('../../../src/agents/base/agent-process.js', () => ({
  runProcess: vi.fn().mockResolvedValue({ output: 'aider response', exitCode: 0 }),
  streamProcess: async function* () { yield 'aid'; yield 'er'; },
}));
vi.mock('../../../src/telemetry/metrics.js', () => ({
  agentActiveProcesses: { labels: () => ({ inc: vi.fn(), dec: vi.fn() }) },
  agentExecutionsTotal: { labels: () => ({ inc: vi.fn() }) },
  agentExecutionDuration: { labels: () => ({ observe: vi.fn() }) },
}));

describe('AiderAdapter', () => {
  let adapter: AiderAdapter;
  beforeEach(() => { adapter = new AiderAdapter(30000, 5); });

  it('reports name as aider', () => {
    expect(adapter.name).toBe('aider');
  });

  it('chat uses last user message', async () => {
    const { runProcess } = await import('../../../src/agents/base/agent-process.js');
    await adapter.chat({
      model: 'aider',
      messages: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'response' },
        { role: 'user', content: 'last user message' },
      ],
    });
    expect(vi.mocked(runProcess).mock.calls[0][1]).toContain('last user message');
  });

  it('streamChat yields chunks', async () => {
    const chunks: string[] = [];
    for await (const c of adapter.streamChat({
      model: 'aider',
      messages: [{ role: 'user', content: 'hello' }],
    })) {
      chunks.push(c);
    }
    expect(chunks).toEqual(['aid', 'er']);
  });
});
