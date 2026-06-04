import 'reflect-metadata';
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../src/app.js';
import { AgentRegistry } from '../../../src/agents/registry/agent-registry.js';
import { MemorySessionStore } from '../../../src/sessions/memory-session-store.js';
import { EchoAdapter } from '../../../src/agents/echo/echo.adapter.js';
import type { Config } from '../../../src/config/config.js';

vi.mock('../../../src/telemetry/metrics.js', () => ({
  register: {
    contentType: 'text/plain',
    metrics: vi.fn().mockResolvedValue('# HELP morph_requests_total\n'),
  },
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

describe('Health & Observability routes', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /ready returns 200', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('GET /metrics returns Prometheus text', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
  });
});
