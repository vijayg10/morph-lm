import { v4 as uuidv4 } from 'uuid';
import { injectable } from 'tsyringe';
import type { Session, SessionStore } from './session.interface.js';
import type { Message } from '../types/common.types.js';
import { sessionsActiveTotal } from '../telemetry/metrics.js';

@injectable()
export class MemorySessionStore implements SessionStore {
  private readonly store = new Map<string, Session>();

  async create(agentName?: string): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      agentName,
    };
    this.store.set(session.id, session);
    sessionsActiveTotal.set(this.store.size);
    return session;
  }

  async get(id: string): Promise<Session | null> {
    return this.store.get(id) ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.store.delete(id);
    if (deleted) sessionsActiveTotal.set(this.store.size);
    return deleted;
  }

  async addMessage(id: string, message: Message): Promise<void> {
    const session = this.store.get(id);
    if (!session) return;
    session.messages.push(message);
    session.updatedAt = new Date();
  }

  list(): Session[] {
    return Array.from(this.store.values());
  }
}
