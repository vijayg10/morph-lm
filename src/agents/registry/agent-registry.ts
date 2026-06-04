import { injectable } from 'tsyringe';
import type { AgentAdapter } from '../base/agent-adapter.interface.js';
import { AppError } from '../../types/common.types.js';
import { getLogger } from '../../telemetry/logger.js';

export interface AgentRegistryEntry {
  name: string;
  available: boolean;
}

@injectable()
export class AgentRegistry {
  private readonly adapters = new Map<string, AgentAdapter>();
  private readonly availability = new Map<string, boolean>();

  register(adapter: AgentAdapter): void {
    this.adapters.set(adapter.name, adapter);
    // Availability starts false; call validateAll() or validateOne() to update
    this.availability.set(adapter.name, false);
  }

  async registerAndValidate(adapter: AgentAdapter): Promise<void> {
    this.adapters.set(adapter.name, adapter);
    const available = await adapter.checkAvailability();
    this.availability.set(adapter.name, available);
  }

  get(name: string): AgentAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new AppError('AGENT_NOT_FOUND', `Model '${name}' not found`);
    }
    if (!this.availability.get(name)) {
      throw new AppError('AGENT_UNAVAILABLE', `Agent '${name}' is not available`);
    }
    return adapter;
  }

  list(): AgentRegistryEntry[] {
    return Array.from(this.adapters.entries()).map(([name]) => ({
      name,
      available: this.availability.get(name) ?? false,
    }));
  }

  listAvailable(): AgentRegistryEntry[] {
    return this.list().filter((e) => e.available);
  }

  async validateAll(): Promise<Map<string, boolean>> {
    const logger = getLogger();
    const results = new Map<string, boolean>();

    await Promise.all(
      Array.from(this.adapters.entries()).map(async ([name, adapter]) => {
        try {
          const available = await adapter.checkAvailability();
          this.availability.set(name, available);
          results.set(name, available);
          if (!available) {
            logger.warn({ agent: name }, 'Agent CLI not found on PATH');
          } else {
            logger.info({ agent: name }, 'Agent validated and available');
          }
        } catch {
          this.availability.set(name, false);
          results.set(name, false);
          logger.warn({ agent: name }, 'Agent availability check failed');
        }
      }),
    );

    return results;
  }
}
