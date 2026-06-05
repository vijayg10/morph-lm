import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiAdapter } from '../../../src/agents/gemini/gemini.adapter.js';

vi.mock('../../../src/utils/which.js', () => ({ which: vi.fn().mockResolvedValue(true) }));
vi.mock('../../../src/agents/base/agent-process.js', () => ({
  runProcess: vi.fn().mockResolvedValue({ output: 'gemini response', exitCode: 0 }),
  streamProcess: async function* () { yield 'gem'; yield 'ini'; },
}));
vi.mock('../../../src/telemetry/metrics.js', () => ({
  agentActiveProcesses: { labels: () => ({ inc: vi.fn(), dec: vi.fn() }) },
  agentExecutionsTotal: { labels: () => ({ inc: vi.fn() }) },
  agentExecutionDuration: { labels: () => ({ observe: vi.fn() }) },
}));

describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter;
  beforeEach(() => { adapter = new GeminiAdapter(30000, 5); });

  it('reports name as gemini:mlm', () => {
    expect(adapter.name).toBe('gemini:mlm');
  });

  it('reports availability via which()', async () => {
    const available = await adapter.checkAvailability();
    expect(available).toBe(true);
  });

  it('chat returns AgentResponse', async () => {
    const result = await adapter.chat({
      model: 'gemini:mlm',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(result.content).toBe('gemini response');
    expect(result.model).toBe('gemini:mlm');
    expect(result.done).toBe(true);
  });

  it('streamChat yields chunks', async () => {
    const chunks: string[] = [];
    for await (const c of adapter.streamChat({
      model: 'gemini:mlm',
      messages: [{ role: 'user', content: 'hello' }],
    })) {
      chunks.push(c);
    }
    expect(chunks).toEqual(['gem', 'ini']);
  });
});
