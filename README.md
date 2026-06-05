# morph-lm

An OpenAI-compatible HTTP gateway that routes chat completion requests to local AI agent CLIs (Gemini CLI, Claude Code, Aider, and custom agents).

## Features

- **OpenAI-compatible API** — Drop-in replacement for OpenAI `v1/models` and `v1/chat/completions`
- **Streaming support** — SSE streaming via `"stream": true`
- **Session management** — Multi-turn conversations via `/v1/sessions`
- **Extensible adapter pattern** — Add any CLI-based agent with minimal boilerplate
- **Workspace isolation** — Restrict agent execution to allowlisted directories
- **Observability** — Prometheus metrics at `/metrics`, structured JSON logs with Pino
- **Rate limiting & authentication** — Bearer token auth, configurable rate limits

## Prerequisites

- Node.js 22+
- One or more agent CLIs installed: `gemini`, `claude`, or `aider`

## Quick Start

```bash
cp .env.example .env
# Edit .env — set API_KEY at minimum

npm install
npm run dev
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `API_KEY` | — | **Required.** Bearer token for API auth |
| `ENABLE_GEMINI` | `true` | Enable Gemini CLI adapter |
| `ENABLE_CLAUDE` | `true` | Enable Claude Code adapter |
| `ENABLE_AIDER` | `false` | Enable Aider adapter |
| `WORKSPACES` | `""` | Comma-separated allowed workspace paths |
| `LOG_LEVEL` | `info` | Pino log level |
| `AGENT_TIMEOUT_MS` | `300000` | Per-agent timeout (ms) |
| `AGENT_CONCURRENCY_LIMIT` | `5` | Max concurrent agent processes |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Liveness check |
| GET | `/ready` | No | Readiness check |
| GET | `/metrics` | No | Prometheus metrics |
| GET | `/v1/models` | Yes | List available agents |
| POST | `/v1/chat/completions` | Yes | Chat completion (stream or non-stream) |
| POST | `/v1/sessions` | Yes | Create session |
| GET | `/v1/sessions/:id` | Yes | Get session with message history |
| DELETE | `/v1/sessions/:id` | Yes | Delete session |

## Usage with OpenAI SDK

```typescript
import OpenAI from 'openai';

const client = new OpenAI({ baseURL: 'http://localhost:3000/v1', apiKey: 'your-api-key' });

const response = await client.chat.completions.create({
  model: 'gemini:mlm',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## Docker

```bash
cd docker
docker compose up
```

## Adding Custom Agents

See [docs/adding-adapters.md](docs/adding-adapters.md).

## Development

```bash
npm run dev          # Start with hot-reload
npm test             # Run all tests
npm run test:coverage  # With coverage report
npm run build        # Compile TypeScript
```
