# Feature Specification: Agent Runtime Service

**Feature Branch**: `001-agent-runtime-service`

**Created**: 2026-06-04

**Status**: Draft

**Input**: User description: "Build a lightweight, production-ready Node.js service that exposes an OpenAI-compatible API while using AI CLI agents as execution backends."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect OpenAI-compatible Client (Priority: P1)

A developer using any OpenAI-compatible application (e.g., LangChain, AnythingLLM, LLM Gateway, Open WebUI, Continue.dev, VS Code extensions) connects to the Agent Runtime Service and sends chat completion requests to any registered AI CLI agent without modifying their client configuration.

**Why this priority**: This is the core value proposition. The OpenAI API format is the universal standard for AI tool integration—supported by virtually all LLM clients and gateways.

**Independent Test**: Can be fully tested by pointing an OpenAI SDK client at the service and verifying chat completion responses are returned correctly from a registered agent.

**Acceptance Scenarios**:

1. **Given** the service is running with agents registered, **When** a client sends `GET /v1/models`, **Then** the response lists all registered agents as available models in OpenAI models format.
2. **Given** the service is running, **When** a client sends `POST /v1/chat/completions` with model "gemini:mlm" and messages, **Then** the response contains the agent's reply in OpenAI chat completions format with proper `id`, `object`, and `choices` fields.
3. **Given** the service is running, **When** a client sends `POST /v1/chat/completions` with `stream: true`, **Then** the response streams Server-Sent Events in OpenAI streaming format.
4. **Given** the service is running behind LLM Gateway, **When** the gateway routes a request to this service, **Then** the response is fully compatible with the gateway's expected format.

---

### User Story 2 - Add New Agent Adapter (Priority: P2)

A developer adds support for a new AI CLI tool (e.g., OpenCode, Codex CLI) by implementing a single adapter interface and registering it, without modifying any API routing or controller logic.

**Why this priority**: Extensibility ensures the service remains useful as new AI tools emerge. This enables community contributions.

**Independent Test**: Can be tested by creating a mock adapter implementing the interface and verifying it's callable through both API formats.

**Acceptance Scenarios**:

1. **Given** a developer creates a new class implementing the AgentAdapter interface, **When** they register it with the agent registry, **Then** the new agent appears in model listings and is callable through all API endpoints.
2. **Given** an adapter is registered, **When** API routes handle requests, **Then** no provider-specific logic exists in the routing or controller layer.

---

### User Story 3 - Workspace-Scoped Agent Execution (Priority: P2)

A developer sends a request specifying a workspace directory, and the agent executes within the context of that directory (e.g., reviewing code in a specific repository).

**Why this priority**: Many AI CLI agents are most useful when operating on a specific codebase. Workspace support unlocks repository-aware operations.

**Independent Test**: Can be tested by sending a request with a valid workspace path and verifying the agent process runs with that directory as its working directory.

**Acceptance Scenarios**:

1. **Given** the workspace "/repos/project-a" is in the allowed list, **When** a client sends a request with `workspace: "/repos/project-a"`, **Then** the agent executes with that directory as its working directory.
2. **Given** a path "/etc/shadow" is NOT in the allowed workspace list, **When** a client sends a request with that workspace, **Then** the service returns an error and does not execute the agent.
3. **Given** a request contains path traversal (e.g., "../../../etc"), **When** the service validates the workspace, **Then** it rejects the request with a security error.

---

### User Story 4 - Session Persistence (Priority: P3)

A developer creates a persistent session to maintain conversation context across multiple requests to the same agent.

**Why this priority**: Enables multi-turn conversations and complex workflows, but basic single-request functionality works without it.

**Independent Test**: Can be tested by creating a session, sending multiple messages, and verifying context is maintained.

**Acceptance Scenarios**:

1. **Given** a client sends `POST /api/sessions`, **When** the session is created, **Then** the response contains a unique session ID.
2. **Given** an active session exists, **When** a client sends subsequent requests referencing that session, **Then** the agent receives prior conversation context.
3. **Given** an active session exists, **When** a client sends `DELETE /api/sessions/:id`, **Then** the session is destroyed and subsequent references to it return an error.

---

### User Story 5 - Production Monitoring (Priority: P3)

An operations team monitors the running service through health checks, readiness probes, and Prometheus-compatible metrics to ensure reliability and performance visibility.

**Why this priority**: Critical for production deployment but not required for core functionality validation.

**Independent Test**: Can be tested by hitting health/readiness/metrics endpoints and verifying correct responses and metric formats.

**Acceptance Scenarios**:

1. **Given** the service is running, **When** a request hits `GET /health`, **Then** it returns `{"status": "ok"}` with HTTP 200.
2. **Given** the service is running with all agents available, **When** a request hits `GET /ready`, **Then** it returns readiness status including agent availability and session store connectivity.
3. **Given** the service has processed requests, **When** a request hits `GET /metrics`, **Then** it returns Prometheus-format metrics including request count, error count, active sessions, and request duration histograms.

---

### Edge Cases

- What happens when a registered agent CLI is not installed or not found on PATH?
- How does the system handle an agent process that hangs indefinitely (timeout)?
- What happens when an agent process crashes mid-stream (non-zero exit code during streaming)?
- How does the system behave under concurrent requests to the same agent?
- What happens when the session store exceeds memory limits under heavy use?
- How does the system handle malformed JSON in request bodies?
- What happens when a client disconnects mid-stream?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose OpenAI-compatible API endpoints (`GET /v1/models`, `POST /v1/chat/completions`) that respond with correctly formatted OpenAI responses.
- **FR-002**: System MUST support streaming responses in OpenAI Server-Sent Events format.
- **FR-003**: System MUST implement an adapter pattern where each AI CLI agent is accessed through a common interface, decoupling API logic from agent implementation.
- **FR-004**: System MUST provide an agent registry that allows registering, discovering, and invoking adapters by model name.
- **FR-005**: System MUST execute AI CLI agents as child processes using safe process spawning (no shell execution, no eval, no dynamic command construction from user input).
- **FR-006**: System MUST validate all incoming requests against defined schemas before processing.
- **FR-007**: System MUST authenticate all non-health requests using Bearer token authentication.
- **FR-008**: System MUST validate workspace paths against an allowlist and reject path traversal attempts.
- **FR-009**: System MUST support session creation, retrieval, and deletion for multi-turn conversations.
- **FR-010**: System MUST enforce request rate limiting on all API endpoints.
- **FR-011**: System MUST provide health (`/health`), readiness (`/ready`), and metrics (`/metrics`) endpoints for production observability.
- **FR-012**: System MUST handle agent process timeouts gracefully (default: 5 minutes per execution), returning appropriate error responses with timeout indication.
- **FR-013**: System MUST return structured error responses with error code and message for all failure scenarios.
- **FR-014**: System MUST support cancellation of in-progress agent executions when a client disconnects.
- **FR-015**: System MUST log all requests, errors, and agent interactions in structured JSON format with request IDs.
- **FR-016**: System MUST enforce a configurable per-agent concurrency limit (default: 5 simultaneous executions per agent), queuing or rejecting excess requests.
- **FR-017**: System MUST validate agent CLI availability on PATH at startup, logging warnings for unavailable agents and excluding them from model listings until available. Service MUST fail to start if zero agents pass validation.

### Key Entities

- **Agent**: Represents a registered AI CLI tool (e.g., Gemini CLI, Claude Code, Aider). Has a name, adapter implementation, and availability status.
- **Session**: Represents a persistent conversation context. Contains a unique ID, creation timestamp, associated agent, message history, and optional workspace path.
- **Request**: An incoming API call from a client. Contains model selection, messages/prompt, optional workspace, optional session reference, and streaming preference.
- **Response**: The output from an agent execution. Can be a complete response or a stream of chunks. Formatted in OpenAI chat completions format.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: OpenAI-compatible clients (LangChain, Open WebUI, Continue.dev, LLM Gateway, VS Code extensions) can connect and exchange messages without any client-side modifications.
- **SC-002**: A new agent adapter can be added and fully operational in under 30 minutes of development time.
- **SC-003**: Service handles 100 concurrent requests without response degradation or errors.
- **SC-004**: 95th percentile request latency (excluding agent processing time) remains below 500ms.
- **SC-005**: Streaming responses begin delivering chunks within 2 seconds of agent producing output.
- **SC-006**: Service operates continuously in Docker without memory leaks or resource exhaustion over 7-day runtime.
- **SC-007**: Zero security vulnerabilities related to arbitrary command execution or path traversal in penetration testing.
- **SC-008**: All API endpoints return correctly formatted responses that pass OpenAI schema validation.

## Clarifications

### Session 2026-06-04

- Q: What should the default agent process timeout be? → A: 5 minutes (balanced—covers most agent operations safely)
- Q: How should the service handle concurrent requests to the same agent? → A: Parallel with per-agent concurrency limit (e.g., max 5 simultaneous per agent)
- Q: What session store strategy should be used? → A: In-memory only (Redis removed entirely)
- Q: How should the service discover which agent CLIs are available? → A: Configuration-driven with startup validation (verify each CLI exists on PATH at boot)
- Q: What happens when all configured agents fail startup validation? → A: Fail startup with a clear error (at least one agent must be available)

## Assumptions

- All target AI CLI agents (Gemini CLI, Claude Code, Aider) are pre-installed on the host system or Docker image and accessible via PATH.
- The service runs as a single instance (horizontal scaling and distributed execution are Phase 3 concerns).
- Session storage is in-memory only; sessions do not persist across service restarts.
- Agent CLI tools communicate via stdin/stdout text protocols (no binary protocols).
- The service does NOT modify or transform the semantic content of agent responses—it only reformats them to match API contracts.
- Authentication uses a single shared API key (RBAC and multi-tenant auth are Phase 3 concerns).
- The default port 3000 is chosen as a standard HTTP service port.
- Web UI, multi-agent orchestration, and MCP support are explicitly out of scope for this specification.
