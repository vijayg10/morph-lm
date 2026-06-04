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
  API_KEY: 'e2e-test-key',
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

/**
 * End-to-end simulation: OpenAI SDK compatible request flow
 */
describe('OpenAI-compatible client flow', () => {
  it('full round-trip: list models → chat completion', async () => {
    const modelsRes = await request(app)
      .get('/v1/models')
      .set('Authorization', 'Bearer e2e-test-key');
    expect(modelsRes.status).toBe(200);
    const model = modelsRes.body.data[0].id;

    const chatRes = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', 'Bearer e2e-test-key')
      .send({ model, messages: [{ role: 'user', content: 'test message' }] });
    expect(chatRes.status).toBe(200);
    expect(chatRes.body.model).toBe(model);
    expect(chatRes.body.choices[0].message.content).toBe('test message');
  });

  it('session context is maintained across turns', async () => {
    const sessionRes = await request(app)
      .post('/v1/sessions')
      .set('Authorization', 'Bearer e2e-test-key')
      .send({});
    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.id;

    // First turn
    await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', 'Bearer e2e-test-key')
      .send({
        model: 'echo',
        messages: [{ role: 'user', content: 'first' }],
        session_id: sessionId,
      });

    // Second turn
    const turn2 = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', 'Bearer e2e-test-key')
      .send({
        model: 'echo',
        messages: [{ role: 'user', content: 'second' }],
        session_id: sessionId,
      });
    expect(turn2.status).toBe(200);

    // Session should have accumulated messages
    const sessionDetail = await request(app)
      .get(`/v1/sessions/${sessionId}`)
      .set('Authorization', 'Bearer e2e-test-key');
    expect(sessionDetail.body.messages.length).toBeGreaterThanOrEqual(2);
  });
});
