<!-- SYNC IMPACT REPORT
Version: 1.0.0 (initial ratification)
Principles Added: Code Quality, Testing Standards, User Experience Consistency, Performance Requirements
Sections Added: API Stability & Contracts, Performance Standards, Deployment Quality
Templates Updated: ✅ spec-template.md ✅ plan-template.md ✅ tasks-template.md
Follow-up TODOs: None
-->

# morph-lm Constitution
Agent Runtime Service—Production-Grade AI CLI Integration Layer

## Core Principles

### I. Code Quality (Non-Negotiable)

All production code MUST maintain the highest quality standards. Every function, service, and API endpoint is subject to rigorous design and implementation review. Code MUST be:
- Readable with clear intent and minimal cognitive load
- Maintainable with consistent patterns and comprehensive comments
- Type-safe using TypeScript's full type system (no implicit `any`)
- Linted with zero configuration deviations

Code reviews MUST explicitly verify adherence; quality issues block merge.

**Rationale**: A runtime service sits between clients and AI agents. Defects cascade across integrations. Tight quality gates prevent production incidents.

### II. Testing Standards (Non-Negotiable)

Test-driven development is mandatory. The testing hierarchy is strictly enforced:

1. **Unit Tests** (required): Each function, service method, and API handler MUST have unit tests. Minimum 80% code coverage per module.
2. **Integration Tests** (required): API contracts, agent CLI communication, and error handling workflows MUST have integration tests.
3. **End-to-End Tests** (required): Each API endpoint (Ollama-compatible, OpenAI-compatible) MUST have E2E tests covering success and failure paths.

Tests MUST be written before implementation. Red-Green-Refactor cycle is enforced in PR reviews.

**Rationale**: A service integrating diverse AI agents requires high confidence that all code paths work. Tests catch regressions early and provide living documentation of expected behavior.

### III. User Experience Consistency

All client-facing APIs MUST maintain strict contract stability and predictable behavior:

- **API Contract Immutability**: Once published, API endpoints MUST NOT break. Backward compatibility is mandatory. Deprecations require two-version notice periods.
- **Response Format Consistency**: All responses (Ollama-compatible and OpenAI-compatible) MUST match published schemas exactly. No surprise fields, no undocumented behavior.
- **Error Handling**: All errors MUST include `code`, `message`, and `details` fields. HTTP status codes MUST align with REST conventions.
- **Documentation**: Every API endpoint MUST have up-to-date documentation with request/response examples.

**Rationale**: External clients depend on our API contracts. Inconsistency breaks integrations and erodes trust. Predictability is a feature.

### IV. Performance Requirements

The service MUST meet strict performance and scalability targets:

- **Request Latency**: 95th percentile latency for API calls MUST be ≤500ms (excluding agent CLI processing time).
- **Throughput**: Service MUST handle ≥100 concurrent requests without degradation.
- **Resource Efficiency**: Memory usage MUST remain <500MB at baseline. CPU utilization MUST scale linearly with request count.
- **Agent Communication**: Agent CLI calls MUST timeout appropriately; no hung requests.

Performance metrics MUST be tracked in CI/CD; regressions MUST be caught before merge.

**Rationale**: The service bridges clients and agents. Poor performance creates bottlenecks for dependent tools (VS Code extensions, Open WebUI, etc.). Performance is part of the contract.

## API Stability & Contracts

All APIs MUST be documented in OpenAPI 3.1.0 (Swagger) format. Documentation MUST be generated from source code annotations, not written manually. API versioning follows semantic versioning:

- **MAJOR** version: Breaking changes (only with two-version deprecation).
- **MINOR** version: New endpoints or non-breaking features.
- **PATCH** version: Bug fixes and internal optimizations.

Request/response schemas MUST use JSON Schema and MUST be validated at runtime.

## Performance Standards

Monitoring and observability are mandatory:

- Structured logging (JSON format) for all requests, errors, and agent interactions.
- Metrics collection (latency, throughput, error rates) exposed on `/metrics` endpoint.
- Health checks at `/health` endpoint reporting service and agent CLI availability.
- Performance budgets enforced in CI: API calls must not degrade by >10% without justification.

## Development Workflow

1. All changes MUST go through pull requests. Direct commits to `main` are forbidden.
2. Every PR MUST include tests and pass all CI checks (lint, test, coverage, performance).
3. Code reviews MUST verify principle compliance explicitly.
4. Merges require approval from at least one maintainer.

## Governance

This constitution supersedes all other practices and guidance documents. It is the source of truth for engineering standards in morph-lm.

**Amendment Process**: Changes to core principles require documented justification, team consensus, and a new version bump following semantic versioning rules.

**Compliance Verification**: All PR reviews MUST reference applicable principles. Violations MUST be explicitly documented and justified (or rejected).

**Runtime Guidance**: See `.github/DEVELOPMENT.md` and `.github/API-REFERENCE.md` for detailed implementation guidance and API specifications.

---

**Version**: 1.0.0 | **Ratified**: 2026-06-04 | **Last Amended**: 2026-06-04
