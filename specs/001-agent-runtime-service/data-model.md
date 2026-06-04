# Data Model: Agent Runtime Service

**Date**: 2026-06-04 | **Phase**: 1 | **Status**: Complete

## Entities

### Agent

Represents a registered AI CLI tool with its adapter and runtime state.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Unique identifier (e.g., "gemini-cli", "claude-code", "aider") |
| command | string | CLI executable name (e.g., "gemini", "claude", "aider") |
| available | boolean | Whether the CLI was found on PATH at startup |
| adapter | AgentAdapter | Implementation of the agent interface |
| concurrencyLimit | number | Max simultaneous executions (default: 5) |
| activeCount | number | Current number of running executions |
| timeoutMs | number | Execution timeout in milliseconds (default: 300000) |

**Relationships**: An Agent has one AgentAdapter. An Agent has many Sessions (via Session.agentName).

**Validation**:
- `name` must be non-empty, lowercase, alphanumeric with hyphens only
- `command` must be non-empty
- `concurrencyLimit` must be ≥1
- `timeoutMs` must be ≥1000

---

### Session

Represents a persistent conversation context for multi-turn interactions.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v4 unique identifier |
| agentName | string | Name of the associated agent |
| workspace | string \| null | Optional workspace directory path |
| messages | Message[] | Ordered conversation history |
| createdAt | Date | Session creation timestamp |
| lastAccessedAt | Date | Last interaction timestamp |

**Relationships**: A Session belongs to one Agent. A Session has many Messages.

**Validation**:
- `id` must be valid UUID v4
- `agentName` must reference a registered agent
- `workspace` if provided, must pass allowlist validation
- `messages` array max length: 1000 (prevent memory exhaustion)

**State transitions**:
- Created → Active (on first message)
- Active → Active (on subsequent messages)
- Active → Deleted (on explicit deletion or TTL expiry)

---

### Message

Represents a single turn in a conversation.

| Field | Type | Description |
|-------|------|-------------|
| role | "user" \| "assistant" \| "system" | Message sender role |
| content | string | Message text content |
| timestamp | Date | When the message was added |

**Validation**:
- `role` must be one of the enum values
- `content` must be non-empty string

---

### GenerateRequest

Internal representation of a text generation request (mapped from OpenAI chat completions with a single user message).

| Field | Type | Description |
|-------|------|-------------|
| model | string | Agent name to invoke |
| prompt | string | Text prompt for generation |
| workspace | string \| null | Optional working directory |
| sessionId | string \| null | Optional session reference |
| stream | boolean | Whether to stream the response |

---

### ChatRequest

Internal representation of a chat completion request.

| Field | Type | Description |
|-------|------|-------------|
| model | string | Agent name to invoke |
| messages | Message[] | Conversation messages |
| workspace | string \| null | Optional working directory |
| sessionId | string \| null | Optional session reference |
| stream | boolean | Whether to stream the response |
| options | Record<string, unknown> | Agent-specific options |

---

### AgentResponse

Internal representation of an agent's output (before format-specific serialization).

| Field | Type | Description |
|-------|------|-------------|
| content | string | Full response text (non-streaming) |
| model | string | Agent name that produced the response |
| done | boolean | Whether generation is complete |
| durationMs | number | Total execution time |

---

### AppError

Structured error representation.

| Field | Type | Description |
|-------|------|-------------|
| code | string | Machine-readable error code (e.g., "AGENT_TIMEOUT") |
| message | string | Human-readable description |
| details | Record<string, unknown> \| null | Additional context |
| statusCode | number | HTTP status code |

**Error codes**:
- `AGENT_NOT_FOUND` (404) — Requested model not in registry
- `AGENT_UNAVAILABLE` (503) — Agent CLI not on PATH
- `AGENT_TIMEOUT` (504) — Execution exceeded timeout
- `AGENT_EXECUTION_FAILED` (502) — Non-zero exit code
- `AGENT_CONCURRENCY_LIMIT` (503) — Queue timeout exceeded
- `VALIDATION_ERROR` (400) — Request schema validation failed
- `UNAUTHORIZED` (401) — Missing or invalid API key
- `WORKSPACE_FORBIDDEN` (403) — Workspace path not in allowlist
- `SESSION_NOT_FOUND` (404) — Session ID doesn't exist
- `INTERNAL_ERROR` (500) — Unexpected server error

---

### Config

Application configuration (validated from environment at startup).

| Field | Type | Description |
|-------|------|-------------|
| host | string | Bind address (default: "0.0.0.0") |
| port | number | Listen port (default: 11434) |
| apiKey | string | Required API key for authentication |
| workspaces | string[] | Allowed workspace directory paths |
| logLevel | string | Pino log level (default: "info") |
| agents | AgentConfig[] | Configured agents with enable flags |
| defaultTimeoutMs | number | Default agent timeout (default: 300000) |
| defaultConcurrencyLimit | number | Default per-agent limit (default: 5) |
| rateLimitWindowMs | number | Rate limit window (default: 60000) |
| rateLimitMax | number | Max requests per window (default: 100) |

---

## Interfaces

### AgentAdapter

```typescript
interface AgentAdapter {
  readonly name: string;
  
  generate(request: GenerateRequest): Promise<AgentResponse>;
  streamGenerate(request: GenerateRequest): AsyncGenerator<string>;
  chat(request: ChatRequest): Promise<AgentResponse>;
  streamChat(request: ChatRequest): AsyncGenerator<string>;
  
  checkAvailability(): Promise<boolean>;
}
```

### SessionStore

```typescript
interface SessionStore {
  create(agentName: string, workspace?: string): Promise<Session>;
  get(id: string): Promise<Session | null>;
  addMessage(id: string, message: Message): Promise<void>;
  delete(id: string): Promise<boolean>;
  list(): Promise<Session[]>;
}
```

### AgentRegistry

```typescript
interface AgentRegistry {
  register(name: string, adapter: AgentAdapter): void;
  get(name: string): AgentAdapter | undefined;
  list(): AgentRegistryEntry[];
  listAvailable(): AgentRegistryEntry[];
  validateAll(): Promise<Map<string, boolean>>;
}
```
