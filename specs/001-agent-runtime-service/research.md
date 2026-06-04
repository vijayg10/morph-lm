# Research: Agent Runtime Service

**Date**: 2026-06-04 | **Phase**: 0 | **Status**: Complete

## Research Tasks

### 1. OpenAI API Compatibility (LLM Gateway Format)

**Decision**: Implement OpenAI Chat Completions API v1 format with SSE streaming. This is the same format used by LLM Gateway (theopenco/llmgateway).

**Rationale**: OpenAI's API is the de facto standard. LLM Gateway, LangChain, Open WebUI, Continue.dev, and virtually all LLM tools support it natively. Using this single format maximizes compatibility.

**Key findings**:
- `GET /v1/models` returns `{ object: "list", data: [{ id, object: "model", created, owned_by }] }`
- `POST /v1/chat/completions` accepts `{ model, messages, stream?, temperature?, max_tokens? }`
- Non-streaming response: `{ id, object: "chat.completion", created, model, choices: [{ index, message, finish_reason }], usage }`
- Streaming uses Server-Sent Events (SSE): `data: {"id","object":"chat.completion.chunk","choices":[{"delta":{"content":"..."}}]}\n\n`
- Final SSE chunk: `data: [DONE]\n\n`
- Content-Type for streaming: `text/event-stream`

**Alternatives considered**:
- Only supporting non-streaming (rejected: streaming is critical for UX with long agent responses)
- Custom streaming format (rejected: breaks client compatibility)

---

### 2. Child Process Management for Streaming

**Decision**: Use `node:child_process` `spawn()` with stdout/stderr streaming pipes, wrapped in an async generator pattern.

**Rationale**: `spawn()` does not invoke a shell (unlike `exec()`), preventing injection attacks. It provides real-time streaming of stdout which maps directly to our streaming response requirement.

**Key findings**:
- `spawn(command, args, { cwd, env, timeout, signal })` is the safe API
- Use `AbortController` for cancellation (Node.js 22+ native support)
- Stream stdout line-by-line using readline interface or Transform stream
- Handle `close`, `error`, and `exit` events for lifecycle management
- Use `child.kill('SIGTERM')` for graceful shutdown, `SIGKILL` after timeout
- Set `maxBuffer` is irrelevant for spawn (only applies to exec)
- Environment isolation: pass minimal env to child processes

**Pattern**:
```typescript
async function* streamAgent(cmd: string, args: string[], opts: SpawnOptions): AsyncGenerator<string> {
  const controller = new AbortController();
  const child = spawn(cmd, args, { ...opts, signal: controller.signal });
  
  for await (const chunk of child.stdout) {
    yield chunk.toString();
  }
  
  // Handle exit code after stream ends
}
```

**Alternatives considered**:
- `exec()` (rejected: shell injection risk, no streaming)
- `execFile()` (rejected: buffers entire output, no streaming)
- Third-party process libraries like `execa` (rejected: unnecessary dependency, spawn is sufficient)

---

### 3. tsyringe with ESM Modules

**Decision**: Use tsyringe with `reflect-metadata` polyfill and TypeScript decorator support for dependency injection.

**Rationale**: tsyringe provides lightweight DI that enables testability (mock injection) without the overhead of larger frameworks like NestJS.

**Key findings**:
- Requires `"experimentalDecorators": true` and `"emitDecoratorMetadata": true` in tsconfig
- Import `reflect-metadata` at application entry point (server.ts)
- Use `@injectable()` decorator on classes, `@inject()` for constructor parameters
- Register services in a container setup file
- For testing: use `container.clearInstances()` and register mocks
- ESM compatibility: works with Node.js 22+ and TypeScript 5+ with proper module configuration
- Token-based injection for interfaces: `const AGENT_REGISTRY = Symbol("AgentRegistry")`

**Alternatives considered**:
- Manual DI (rejected: verbose, error-prone wiring in large service)
- InversifyJS (rejected: heavier, more boilerplate)
- No DI, module-level singletons (rejected: hard to test, tight coupling)

---

### 4. Per-Agent Concurrency Limiting

**Decision**: Use a semaphore pattern (counting semaphore) per agent to limit concurrent process executions.

**Rationale**: Each agent CLI consumes significant system resources (CPU, memory, I/O). Unbounded spawning could exhaust the host. A per-agent semaphore ensures fair resource allocation.

**Key findings**:
- Implement as a simple class with `acquire()` (returns Promise) and `release()` methods
- Use a queue (array of resolvers) for waiting requests
- Default limit: 5 per agent (configurable)
- When limit reached: queue the request (don't reject immediately)
- Add a queue timeout to prevent indefinite waiting (e.g., 30 seconds in queue → 503 Service Unavailable)
- Track queue depth in metrics for capacity planning

**Alternatives considered**:
- Global process pool (rejected: one busy agent would starve others)
- Reject immediately at limit (rejected: bad UX for short-lived bursts)
- OS-level cgroups (rejected: over-engineering for single-instance)

---

### 5. Agent CLI Communication Patterns

**Decision**: Each adapter defines its own CLI invocation pattern (command, args, input method) while sharing the common process management infrastructure.

**Rationale**: Each AI CLI tool has a different interface. Gemini CLI, Claude Code, and Aider all accept input differently. The adapter pattern encapsulates these differences.

**Key findings**:
- **Gemini CLI**: `gemini -p "prompt"` or piped stdin
- **Claude Code**: `claude -p "prompt"` with `--output-format json` for structured output
- **Aider**: `aider --message "prompt"` with `--no-git` for non-interactive mode
- All support working directory via `cwd` option in spawn
- Output parsing varies: some produce structured JSON, others plain text
- Adapters must normalize output to a common internal format before serialization

**Alternatives considered**:
- Universal CLI interface (rejected: each tool has unique flags and behaviors)
- HTTP-based agent communication (rejected: these are CLI tools, not servers)
