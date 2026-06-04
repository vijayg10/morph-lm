import type { ChatRequest, AgentResponse } from '../../types/common.types.js';

export interface AgentAdapter {
  readonly name: string;

  chat(request: ChatRequest): Promise<AgentResponse>;
  streamChat(request: ChatRequest): AsyncGenerator<string>;

  checkAvailability(): Promise<boolean>;
}
