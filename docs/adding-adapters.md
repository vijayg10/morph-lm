# Adding Custom Agent Adapters

## Overview

`morph-lm` uses the **Adapter pattern** to decouple the HTTP API from agent CLI implementations. All agents implement the `AgentAdapter` interface.

## 1. Implement the AgentAdapter Interface

Create a new file under `src/agents/<your-agent>/<your-agent>.adapter.ts`:

```typescript
import type { AgentAdapter } from '../base/agent-adapter.interface.js';
import type { ChatRequest, AgentResponse } from '../../types/common.types.js';

export class MyAgentAdapter implements AgentAdapter {
  readonly name = 'my-agent'; // Must be unique; used as the OpenAI model ID

  async checkAvailability(): Promise<boolean> {
    // Return true if the agent CLI binary is available on PATH
    return which('my-agent-cli');
  }

  async chat(request: ChatRequest): Promise<AgentResponse> {
    // Implement non-streaming response
    const result = await runProcess('my-agent-cli', ['--prompt', request.messages.at(-1)!.content], {
      cwd: request.workspace,
      timeoutMs: 60_000,
    });
    return { content: result.output, model: this.name, done: true, durationMs: 0 };
  }

  async *streamChat(request: ChatRequest): AsyncGenerator<string> {
    // Implement streaming response using streamProcess
    yield* streamProcess('my-agent-cli', ['--prompt', request.messages.at(-1)!.content], {
      cwd: request.workspace,
      timeoutMs: 60_000,
    });
  }
}
```

## 2. Register the Adapter

Open `src/container.ts` and add your adapter:

```typescript
import { MyAgentAdapter } from './agents/my-agent/my-agent.adapter.js';

// Inside setupContainer():
const myAgent = new MyAgentAdapter(config.AGENT_TIMEOUT_MS, config.AGENT_CONCURRENCY_LIMIT);
registry.register(myAgent);
```

## 3. Add Feature Flag (Optional)

Add an env variable to `.env.example`:

```env
ENABLE_MY_AGENT=true
```

In `src/config/config.ts` extend the schema:

```typescript
ENABLE_MY_AGENT: z.coerce.boolean().default(true),
```

Then guard registration in `container.ts`:

```typescript
if (config.ENABLE_MY_AGENT) registry.register(myAgent);
```

## 4. Write Tests

Add unit tests at `tests/unit/agents/my-agent.test.ts` following the pattern in `tests/unit/agents/gemini-adapter.test.ts`.

## Available Utilities

| Utility | Location | Purpose |
|---------|----------|---------|
| `runProcess` | `src/agents/base/agent-process.ts` | Non-streaming process execution |
| `streamProcess` | `src/agents/base/agent-process.ts` | Streaming process execution |
| `ConcurrencyLimiter` | `src/agents/base/concurrency-limiter.ts` | Limit concurrent agent calls |
| `which` | `src/utils/which.ts` | Check binary availability |
