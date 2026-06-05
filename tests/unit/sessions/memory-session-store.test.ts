import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemorySessionStore } from '../../../src/sessions/memory-session-store.js';

vi.mock('../../../src/telemetry/metrics.js', () => ({
  sessionsActiveTotal: { set: vi.fn() },
}));

describe('MemorySessionStore', () => {
  let store: MemorySessionStore;

  beforeEach(() => {
    store = new MemorySessionStore();
  });

  it('creates a session with a uuid id', async () => {
    const session = await store.create('gemini:mlm');
    expect(session.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(session.agentName).toBe('gemini:mlm');
    expect(session.messages).toHaveLength(0);
  });

  it('retrieves an existing session', async () => {
    const created = await store.create();
    const found = await store.get(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it('returns null for unknown id', async () => {
    const found = await store.get('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });

  it('adds messages to a session', async () => {
    const session = await store.create();
    await store.addMessage(session.id, { role: 'user', content: 'hello' });
    const updated = await store.get(session.id);
    expect(updated!.messages).toHaveLength(1);
    expect(updated!.messages[0].content).toBe('hello');
  });

  it('deletes a session', async () => {
    const session = await store.create();
    const deleted = await store.delete(session.id);
    expect(deleted).toBe(true);
    expect(await store.get(session.id)).toBeNull();
  });

  it('returns false when deleting non-existent session', async () => {
    const deleted = await store.delete('00000000-0000-0000-0000-000000000000');
    expect(deleted).toBe(false);
  });

  it('lists all sessions', async () => {
    await store.create('a');
    await store.create('b');
    expect(store.list()).toHaveLength(2);
  });
});
