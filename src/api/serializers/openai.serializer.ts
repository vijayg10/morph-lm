import { v4 as uuidv4 } from 'uuid';
import type { AgentResponse } from '../../types/common.types.js';
import type {
  OpenAIModelsResponse,
  OpenAIModel,
  OpenAIChatCompletionResponse,
  OpenAIChatCompletionChunk,
} from '../../types/openai.types.js';

export function serializeModels(agentNames: string[]): OpenAIModelsResponse {
  const now = Math.floor(Date.now() / 1000);
  const data: OpenAIModel[] = agentNames.map((name) => ({
    id: name,
    object: 'model',
    created: now,
    owned_by: 'morph-lm',
  }));
  return { object: 'list', data };
}

export function serializeChatCompletion(
  response: AgentResponse,
): OpenAIChatCompletionResponse {
  return {
    id: `chatcmpl-${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: response.model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: response.content },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

export function serializeChunk(
  id: string,
  model: string,
  content: string,
  isFirst = false,
): string {
  const chunk: OpenAIChatCompletionChunk = {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: isFirst ? { role: 'assistant', content: '' } : { content },
        finish_reason: null,
      },
    ],
  };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

export function serializeFinalChunk(id: string, model: string): string {
  const chunk: OpenAIChatCompletionChunk = {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  };
  return `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`;
}
