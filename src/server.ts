import 'reflect-metadata';
import { loadConfig } from './config/config.js';
import { createLogger } from './telemetry/logger.js';
import { setupContainer, TOKENS, container } from './container.js';
import { createApp } from './app.js';
import type { AgentRegistry } from './agents/registry/agent-registry.js';
import type { SessionStore } from './sessions/session.interface.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);

  logger.info('Starting morph-lm agent runtime service...');

  setupContainer(config);

  const registry = container.resolve<AgentRegistry>(TOKENS.AgentRegistry);
  const sessionStore = container.resolve<SessionStore>(TOKENS.SessionStore);

  // Validate all configured agents
  const availability = await registry.validateAll();
  const available = Array.from(availability.entries()).filter(([, v]) => v).map(([k]) => k);
  const unavailable = Array.from(availability.entries()).filter(([, v]) => !v).map(([k]) => k);

  if (available.length === 0) {
    logger.fatal({ unavailable }, 'No agents are available on PATH. Cannot start service.');
    process.exit(1);
  }

  logger.info({ available, unavailable }, 'Agent validation complete');

  const app = createApp(config, registry, sessionStore);

  const server = app.listen(config.PORT, config.HOST, () => {
    logger.info({ host: config.HOST, port: config.PORT }, 'Service started');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
