import type { AgentAdapter } from '../base/agent-adapter.interface.js';
import type { ChatRequest, AgentResponse } from '../../types/common.types.js';

/**
 * EchoAdapter — demonstrates the AgentAdapter extensibility contract.
 * Echoes the last user message back as the assistant reply.
 */
export class EchoAdapter implements AgentAdapter {
  readonly name = 'echo';

  async checkAvailability(): Promise<boolean> {
    return true;
  }

  async chat(request: ChatRequest): Promise<AgentResponse> {
    const last = [...request.messages].reverse().find((m) => m.role === 'user');
    return {
      content: last?.content ?? '',
      model: this.name,
      done: true,
      durationMs: 0,
    };
  }

  async *streamChat(request: ChatRequest): AsyncGenerator<string> {
    const last = [...request.messages].reverse().find((m) => m.role === 'user');
    const words = (last?.content ?? '').split(' ');
    for (const word of words) {
      yield `${word} `;
    }
  }
}
