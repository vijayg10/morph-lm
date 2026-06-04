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

describe('Session API', () => {
  it('POST /v1/sessions creates a session', async () => {
    const res = await request(app)
      .post('/v1/sessions')
      .set('Authorization', 'Bearer test-api-key')
      .send({ agent_name: 'echo' });
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.agent_name).toBe('echo');
  });

  it('GET /v1/sessions/:id retrieves a session', async () => {
    const createRes = await request(app)
      .post('/v1/sessions')
      .set('Authorization', 'Bearer test-api-key')
      .send({});
    const { id } = createRes.body;

    const getRes = await request(app)
      .get(`/v1/sessions/${id}`)
      .set('Authorization', 'Bearer test-api-key');
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(id);
  });

  it('GET /v1/sessions/:id returns 404 for unknown id', async () => {
    const res = await request(app)
      .get('/v1/sessions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', 'Bearer test-api-key');
    expect(res.status).toBe(404);
  });

  it('DELETE /v1/sessions/:id removes the session', async () => {
    const createRes = await request(app)
      .post('/v1/sessions')
      .set('Authorization', 'Bearer test-api-key')
      .send({});
    const { id } = createRes.body;

    const delRes = await request(app)
      .delete(`/v1/sessions/${id}`)
      .set('Authorization', 'Bearer test-api-key');
    expect(delRes.status).toBe(204);

    const getRes = await request(app)
      .get(`/v1/sessions/${id}`)
      .set('Authorization', 'Bearer test-api-key');
    expect(getRes.status).toBe(404);
  });
});
