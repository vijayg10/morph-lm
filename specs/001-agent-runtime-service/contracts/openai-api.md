# API Contract: OpenAI-Compatible Endpoints

**Version**: 1.0.0 | **Format**: REST/JSON + SSE | **Base Path**: `/v1`

**Compatibility**: OpenAI API v1, LLM Gateway (theopenco/llmgateway)

---

## GET /v1/models

List all available models (registered agents).

### Request

No body. No query parameters.

### Headers

| Header | Required | Value |
|--------|----------|-------|
| Authorization | Yes | `Bearer <api-key>` |

### Response 200

```json
{
  "object": "list",
  "data": [
    {
      "id": "gemini:mlm",
      "object": "model",
      "created": 1717459200,
      "owned_by": "morph-lm"
    },
    {
      "id": "claude:mlm",
      "object": "model",
      "created": 1717459200,
      "owned_by": "morph-lm"
    },
    {
      "id": "aider",
      "object": "model",
      "created": 1717459200,
      "owned_by": "morph-lm"
    }
  ]
}
```

### Response 401

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid API key",
    "type": "authentication_error"
  }
}
```

---

## POST /v1/chat/completions

Create a chat completion using a specified agent.

### Request

```json
{
  "model": "gemini:mlm",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Explain Kubernetes"
    }
  ],
  "stream": false,
  "temperature": 1.0,
  "max_tokens": null,
  "workspace": "/repos/project-a",
  "session_id": "uuid-v4-here"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| model | string | Yes | — | Agent name to invoke |
| messages | Message[] | Yes | — | Conversation messages |
| stream | boolean | No | false | Enable SSE streaming |
| temperature | number | No | 1.0 | Passed to agent if supported |
| max_tokens | number \| null | No | null | Passed to agent if supported |
| workspace | string | No | null | Working directory (extension field) |
| session_id | string | No | null | Session reference (extension field) |

**Note**: `workspace` and `session_id` are extension fields not in the standard OpenAI spec. They are passed as additional top-level fields and ignored by standard OpenAI clients.

### Headers

| Header | Required | Value |
|--------|----------|-------|
| Authorization | Yes | `Bearer <api-key>` |
| Content-Type | Yes | `application/json` |

### Response 200 (non-streaming)

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1717459200,
  "model": "gemini:mlm",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Kubernetes is a container orchestration platform..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

**Note**: Token usage is reported as 0 since CLI agents don't expose token counts. Clients should not rely on usage data from this service.

### Response 200 (streaming)

Content-Type: `text/event-stream`

```
data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1717459200,"model":"gemini:mlm","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1717459200,"model":"gemini:mlm","choices":[{"index":0,"delta":{"content":"Kubernetes"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1717459200,"model":"gemini:mlm","choices":[{"index":0,"delta":{"content":" is"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1717459200,"model":"gemini:mlm","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

### Error Responses

All errors follow OpenAI error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "type": "error_type",
    "param": null
  }
}
```

| Status | Code | Type | Condition |
|--------|------|------|-----------|
| 400 | VALIDATION_ERROR | invalid_request_error | Invalid request body |
| 401 | UNAUTHORIZED | authentication_error | Missing/invalid API key |
| 403 | WORKSPACE_FORBIDDEN | permission_error | Workspace not in allowlist |
| 404 | AGENT_NOT_FOUND | not_found_error | Model not registered |
| 429 | RATE_LIMITED | rate_limit_error | Too many requests |
| 503 | AGENT_UNAVAILABLE | service_unavailable_error | Agent CLI not on PATH |
| 503 | AGENT_CONCURRENCY_LIMIT | service_unavailable_error | Queue timeout exceeded |
| 504 | AGENT_TIMEOUT | timeout_error | Execution exceeded 5-min timeout |
| 502 | AGENT_EXECUTION_FAILED | server_error | Non-zero exit code |
| 500 | INTERNAL_ERROR | server_error | Unexpected server error |

---

## Session Endpoints

### POST /v1/sessions

Create a new conversation session.

#### Request

```json
{
  "model": "gemini:mlm",
  "workspace": "/repos/project-a"
}
```

| Field | Type | Required | Default |
|-------|------|----------|---------|
| model | string | Yes | — |
| workspace | string | No | null |

#### Response 201

```json
{
  "id": "sess_abc123",
  "object": "session",
  "model": "gemini:mlm",
  "workspace": "/repos/project-a",
  "created_at": 1717459200
}
```

---

### GET /v1/sessions/:id

Retrieve session details.

#### Response 200

```json
{
  "id": "sess_abc123",
  "object": "session",
  "model": "gemini:mlm",
  "workspace": "/repos/project-a",
  "created_at": 1717459200,
  "message_count": 4
}
```

#### Response 404

```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session not found",
    "type": "not_found_error"
  }
}
```

---

### DELETE /v1/sessions/:id

Delete a session.

#### Response 204

No body.

#### Response 404

```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session not found",
    "type": "not_found_error"
  }
}
```

---

## Health & Observability Endpoints

These endpoints do NOT require authentication.

### GET /health

```json
{
  "status": "ok"
}
```

### GET /ready

```json
{
  "status": "ready",
  "agents": {
    "gemini:mlm": true,
    "claude:mlm": true,
    "aider": false
  }
}
```

### GET /metrics

Prometheus text format. Includes:
- `http_requests_total{method, path, status}`
- `http_request_duration_seconds{method, path}`
- `agent_executions_total{agent, status}`
- `agent_execution_duration_seconds{agent}`
- `agent_active_processes{agent}`
- `sessions_active_total`
