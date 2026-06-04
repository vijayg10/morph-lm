import 'reflect-metadata';
import { container } from 'tsyringe';
import { AgentRegistry } from './agents/registry/agent-registry.js';
import { GeminiAdapter } from './agents/gemini/gemini.adapter.js';
import { ClaudeAdapter } from './agents/claude/claude.adapter.js';
import { AiderAdapter } from './agents/aider/aider.adapter.js';
import { MemorySessionStore } from './sessions/memory-session-store.js';
import type { Config } from './config/config.js';

export const TOKENS = {
  Config: Symbol('Config'),
  AgentRegistry: Symbol('AgentRegistry'),
  SessionStore: Symbol('SessionStore'),
};

export function setupContainer(config: Config): void {
  container.registerInstance(TOKENS.Config, config);

  const registry = new AgentRegistry();

  if (config.ENABLE_GEMINI) {
    registry.register(new GeminiAdapter(config.AGENT_TIMEOUT_MS, config.AGENT_CONCURRENCY_LIMIT));
  }
  if (config.ENABLE_CLAUDE) {
    registry.register(new ClaudeAdapter(config.AGENT_TIMEOUT_MS, config.AGENT_CONCURRENCY_LIMIT));
  }
  if (config.ENABLE_AIDER) {
    registry.register(new AiderAdapter(config.AGENT_TIMEOUT_MS, config.AGENT_CONCURRENCY_LIMIT));
  }

  container.registerInstance(TOKENS.AgentRegistry, registry);
  container.registerInstance(TOKENS.SessionStore, new MemorySessionStore());
}

export { container };
