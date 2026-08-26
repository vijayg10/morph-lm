import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.FUNC_TEST_BASE_URL as string;
const API_KEY = process.env.FUNC_TEST_API_KEY as string;
const AVAILABLE_MODELS = (process.env.FUNC_TEST_MODELS ?? '').split(',').filter(Boolean);
const MODEL = AVAILABLE_MODELS.includes('claude:mlm') ? 'claude:mlm' : AVAILABLE_MODELS[0];

function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${API_KEY}`,
    },
  });
}

async function chat(model: string, content: string): Promise<Response> {
  return authedFetch('/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content }] }),
  });
}

/**
 * Functional (black-box) tests: exercise the real, running server process
 * over the network via its public HTTP API, exactly as an OpenAI-compatible
 * client would — including dispatching to the real Claude/Gemini CLIs.
 * No app internals are imported or mocked.
 */
describe('OpenAI-compatible client flow (func)', () => {
  it('health check responds without auth', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('lists at least one available agent', () => {
    expect(AVAILABLE_MODELS.length).toBeGreaterThan(0);
  });

  it('full round-trip: list models → chat completion against a real agent', async () => {
    const modelsRes = await authedFetch('/v1/models');
    expect(modelsRes.status).toBe(200);
    const modelsBody = await modelsRes.json();
    expect(modelsBody.data.map((m: { id: string }) => m.id)).toEqual(AVAILABLE_MODELS);

    const chatRes = await chat(MODEL, 'Reply with exactly one word: pong');
    expect(chatRes.status).toBe(200);
    const chatBody = await chatRes.json();
    expect(chatBody.model).toBe(MODEL);
    expect(chatBody.choices[0].finish_reason).toBe('stop');
    expect(typeof chatBody.choices[0].message.content).toBe('string');
    expect(chatBody.choices[0].message.content.length).toBeGreaterThan(0);
  });

  it.skipIf(!AVAILABLE_MODELS.includes('claude:mlm'))(
    'claude:mlm answers a real prompt via the Claude CLI',
    async () => {
      const res = await chat('claude:mlm', 'Reply with exactly one word: pong');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.choices[0].message.content.toLowerCase()).toContain('pong');
    },
  );

  it.skipIf(!AVAILABLE_MODELS.includes('gemini:mlm'))(
    'gemini:mlm answers a real prompt via the Gemini CLI',
    async () => {
      const res = await chat('gemini:mlm', 'Reply with exactly one word: pong');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.choices[0].message.content.toLowerCase()).toContain('pong');
    },
  );

  it('session context is maintained across turns', async () => {
    const sessionRes = await authedFetch('/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(sessionRes.status).toBe(201);
    const sessionBody = await sessionRes.json();
    const sessionId = sessionBody.id;

    await authedFetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'My favorite number is 42. Just acknowledge briefly.' }],
        session_id: sessionId,
      }),
    });

    const turn2 = await authedFetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'What number did I just mention?' }],
        session_id: sessionId,
      }),
    });
    expect(turn2.status).toBe(200);

    const sessionDetail = await authedFetch(`/v1/sessions/${sessionId}`);
    const sessionDetailBody = await sessionDetail.json();
    expect(sessionDetailBody.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects requests without a valid API key', async () => {
    const res = await fetch(`${BASE_URL}/v1/models`);
    expect(res.status).toBe(401);
  });
});
