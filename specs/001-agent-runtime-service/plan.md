# Implementation Plan: Agent Runtime Service

**Branch**: `001-agent-runtime-service` | **Date**: 2026-06-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-agent-runtime-service/spec.md`

## Summary

Build a production-ready TypeScript/Express HTTP service exposing an OpenAI-compatible API that delegates to AI CLI agents (Gemini CLI, Claude Code, Aider) via safe child process spawning. The service uses an adapter pattern for agent abstraction, in-memory session management, Zod request validation, and Prometheus metrics for observability. Compatible with LLM Gateway and any OpenAI SDK client.

## Technical Context

**Language/Version**: TypeScript 5+ on Node.js 22+ (ESM modules)

**Primary Dependencies**: Express, Zod, Pino, tsyringe, prom-client, express-rate-limit, helmet, cors, compression

**Storage**: In-memory (Map-based session store; no external database)

**Testing**: Vitest (unit + integration + E2E)

**Target Platform**: Linux server (Docker), macOS development

**Project Type**: web-service

**Performance Goals**: ≥100 concurrent requests, ≤500ms p95 latency (excluding agent processing)

**Constraints**: <500MB baseline memory, 5-minute agent timeout, 5 concurrent executions per agent

**Scale/Scope**: Single instance, 3 initial agent adapters, 3 API endpoints + 3 observability endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Code Quality | ✅ PASS | TypeScript strict mode, ESLint, consistent adapter pattern, DI via tsyringe |
| II. Testing Standards | ✅ PASS | Vitest with unit/integration/E2E, TDD enforced, 80% coverage target |
| III. User Experience Consistency | ✅ PASS | OpenAI schema validation via Zod, structured error format, OpenAPI docs |
| IV. Performance Requirements | ✅ PASS | prom-client metrics, p95 <500ms target, per-agent concurrency limits |
| API Stability & Contracts | ✅ PASS | OpenAPI 3.1.0 generation, semantic versioning, runtime schema validation |
| Performance Standards | ✅ PASS | Pino structured logging, /metrics endpoint, /health endpoint, CI perf budgets |
| Development Workflow | ✅ PASS | PR-based, CI checks (lint, test, coverage, performance) |

**Gate Result: PASS** — All principles satisfied. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── api/
│   ├── routes/
│   │   ├── openai.routes.ts
│   │   ├── session.routes.ts
│   │   └── health.routes.ts
│   ├── controllers/
│   │   ├── openai.controller.ts
│   │   └── session.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   ├── request-id.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── validators/
│   │   ├── openai.schemas.ts
│   │   └── session.schemas.ts
│   └── serializers/
│       └── openai.serializer.ts
├── agents/
│   ├── base/
│   │   ├── agent-adapter.interface.ts
│   │   ├── agent-process.ts
│   │   └── concurrency-limiter.ts
│   ├── gemini/
│   │   └── gemini.adapter.ts
│   ├── claude/
│   │   └── claude.adapter.ts
│   ├── aider/
│   │   └── aider.adapter.ts
│   └── registry/
│       └── agent-registry.ts
├── sessions/
│   ├── session.interface.ts
│   └── memory-session-store.ts
├── config/
│   └── config.ts
├── telemetry/
│   ├── logger.ts
│   └── metrics.ts
├── types/
│   ├── openai.types.ts
│   └── common.types.ts
├── app.ts
└── server.ts

tests/
├── unit/
│   ├── agents/
│   ├── sessions/
│   ├── validators/
│   └── serializers/
├── integration/
│   ├── openai-api.test.ts
│   └── session-api.test.ts
└── e2e/
    └── openai-client.test.ts

docker/
├── Dockerfile
└── docker-compose.yml
```

**Structure Decision**: Single project layout following the Express service pattern from the feature spec. Source code in `src/` with domain-based module grouping (api, agents, sessions, config, telemetry). Tests mirror the testing pyramid (unit → integration → e2e).

## Complexity Tracking

> No constitution violations. Table intentionally empty.
