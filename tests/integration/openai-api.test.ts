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
  agentActiveProcesses: { labels: () => ({ inc: vi.fn(), dec: vi.fn() }) },
  agentExecutionsTotal: { labels: () => ({ inc: vi.fn() }) },
  agentExecutionDuration: { labels: () => ({ observe: vi.fn() }) },
  sessionsActiveTotal: { set: vi.fn() },
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
  const sessionStore = new MemorySessionStore();
  app = createApp(config, registry, sessionStore);
});

describe('GET /v1/models', () => {
  it('returns 200 with echo in the list', async () => {
    const res = await request(app)
      .get('/v1/models')
      .set('Authorization', 'Bearer test-api-key');
    expect(res.status).toBe(200);
    expect(res.body.object).toBe('list');
    expect(res.body.data.some((m: any) => m.id === 'echo')).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/v1/models');
    expect(res.status).toBe(401);
  });
});

describe('POST /v1/chat/completions', () => {
  it('returns 200 for non-streaming request', async () => {
    const res = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', 'Bearer test-api-key')
      .send({ model: 'echo', messages: [{ role: 'user', content: 'hello' }] });
    expect(res.status).toBe(200);
    expect(res.body.object).toBe('chat.completion');
    expect(res.body.choices[0].message.content).toBe('hello');
  });

  it('returns 422 for invalid request body', async () => {
    const res = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', 'Bearer test-api-key')
      .send({ model: '', messages: [] });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown model', async () => {
    const res = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', 'Bearer test-api-key')
      .send({ model: 'unknown-model', messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(404);
  });
});
