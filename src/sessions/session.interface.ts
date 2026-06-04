import type { Message } from '../types/common.types.js';

export interface Session {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  agentName?: string | undefined;
}

export interface SessionStore {
  create(agentName?: string): Promise<Session>;
  get(id: string): Promise<Session | null>;
  delete(id: string): Promise<boolean>;
  addMessage(id: string, message: Message): Promise<void>;
  list(): Session[];
}
