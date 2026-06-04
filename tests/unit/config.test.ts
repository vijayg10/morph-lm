import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config/config.js';

describe('loadConfig', () => {
  it('throws when API_KEY is missing', () => {
    const saved = process.env.API_KEY;
    delete process.env.API_KEY;
    expect(() => loadConfig()).toThrow();
    if (saved !== undefined) process.env.API_KEY = saved;
  });

  it('uses defaults for optional fields', () => {
    process.env.API_KEY = 'test-key';
    const config = loadConfig();
    expect(config.PORT).toBe(3000);
    expect(config.HOST).toBe('0.0.0.0');
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.AGENT_TIMEOUT_MS).toBe(300000);
    expect(config.AGENT_CONCURRENCY_LIMIT).toBe(5);
  });

  it('parses WORKSPACES as array', () => {
    process.env.API_KEY = 'test-key';
    process.env.WORKSPACES = '/repos,/projects';
    const config = loadConfig();
    expect(config.WORKSPACES).toEqual(['/repos', '/projects']);
    delete process.env.WORKSPACES;
  });
});
