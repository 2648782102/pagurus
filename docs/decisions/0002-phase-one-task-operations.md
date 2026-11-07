# Decision 0002: Phase-one task operations client

Status: **accepted for the phase-1 task operations UI; configuration management remains planned work**

Date: 2026-11-07 (Asia/Shanghai).

## Context

Conchbase [ADR 0010](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0010-first-real-model-slice.md) accepts a real-model phase-1 slice and publishes task, model-catalog, event, cancel, and retry routes in its `docs/openapi.yaml`. Pagurus is an optional client of that contract. The existing Pagurus guardrails intentionally reject write calls because no public task route existed yet.

## Decision

Add a typed `tasks` API client for the published Conchbase phase-1 routes. Add an operations panel where a user selects a model from the Magpie catalog exposed by Conchbase, enters a prompt, starts one task, sees its state and result, and can cancel or retry. Poll `GET /v1/tasks/{taskId}` while a task is active; do not implement SSE before Conchbase defines it. Keep all data in component state; do not use browser storage or local secrets.

Configuration management for Agents, MCP, Skills, policies, and plugins remains a planned workspace. The new panel is task operations, not a claim that Pagurus can configure an agent. No second API schema is introduced: request/response types mirror Conchbase's published versioned contract and are validated at the HTTP boundary.

## Consequences

- CLI, Pagurus, and third-party clients exercise the same runtime API and durable task state.
- Model credentials remain in Magpie. Pagurus sees only model ids and display names from Conchbase.
- Polling is simple and adequate for one bounded model turn; it will need replacement when streaming and frequent events are accepted.
- The client-side guardrails must evolve in the same slice to allow exactly the documented task/retry/cancel writes and reject credential/browser-storage/private-file patterns.

## Validation

- API client tests use a mocked `fetch` and assert paths, methods, payload validation, and error handling.
- Component tests cover catalog loading, empty model state, task creation, active state, success, failure, cancellation, retry, keyboard labels, and narrow layout classes.
- Repository guardrails check the accepted write routes, AI-first entry documents, loopback proxy, dependency boundaries, and representative synthetic violations.
- Run `npm run check`, `npm test`, and `npm run build`; no public network or real credential is used in CI.
