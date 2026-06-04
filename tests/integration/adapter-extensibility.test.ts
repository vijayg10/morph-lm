import 'reflect-metadata';
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../src/app.js';
import { AgentRegistry } from '../../../src/agents/registry/agent-registry.js';
import { MemorySessionStore } from '../../../src/sessions/memory-session-store.js';
import { EchoAdapter } from '../../../src/agents/echo/echo.adapter.js';
import type { Config } from '../../../src/config/config.js';

vi.mock('../../../src/telemetry/metrics.js', () => ({
  register: { contentType: 'text/plain', metrics: vi.fn().mockResolvedValue('') },
  httpRequestsTotal: { labels: () => ({ inc: vi.fn() }) },
  httpRequestDuration: { labels: () => ({ startTimer: () => vi.fn() }) },
  sessionsActiveTotal: { set: vi.fn() },
  agentActiveProcesses: { labels: () => ({ inc: vi.fn(), dec: vi.fn() }) },
  agentExecutionsTotal: { labels: () => ({ inc: vi.fn() }) },
  agentExecutionDuration: { labels: () => ({ observe: vi.fn() }) },
}));

const config: Config = {
  HOST: '0.0.0.0',
  PORT: 3000,
  API_KEY: 'test-api-key',
  ENABLE_GEMINI: false,
  ENABLE_CLAUDE: false,
  ENABLE_AIDER: false,
  LOG_LEVEL: 'silent',
  WORKSPACES: [],
  AGENT_TIMEOUT_MS: 30000,
  AGENT_CONCURRENCY_LIMIT: 5,
  RATE_LIMIT_WINDOW_MS: 60000,
  RATE_LIMIT_MAX: 100,
};

let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  const registry = new AgentRegistry();
  await registry.registerAndValidate(new EchoAdapter());
  app = createApp(config, registry, new MemorySessionStore());
});

describe('Adapter extensibility', () => {
  it('custom EchoAdapter appears in /v1/models', async () => {
    const res = await request(app)
      .get('/v1/models')
      .set('Authorization', 'Bearer test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.data.map((m: any) => m.id)).toContain('echo');
  });

  it('custom EchoAdapter processes chat/completions', async () => {
    const res = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', 'Bearer test-api-key')
      .send({ model: 'echo', messages: [{ role: 'user', content: 'ping' }] });
    expect(res.status).toBe(200);
    expect(res.body.choices[0].message.content).toBe('ping');
  });
});
