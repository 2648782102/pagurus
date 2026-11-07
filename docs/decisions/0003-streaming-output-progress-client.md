# Decision 0003: Streaming output progress client

Status: **accepted for the phase-1 streaming progress UI; Conchbase owns the public API contract**

Date: 2026-11-07 (Asia/Shanghai).

## Context

Conchbase [ADR 0012](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0012-streaming-output-progress.md) accepts durable `task.output_delta` events and adds `partialOutput` to the versioned `Task` schema. Pagurus already polls `GET /v1/tasks/{taskId}` while a task is active, but its task validator and result panel only understand the final `output` field. A client that ignores `partialOutput` would show a generic running state even though the runtime now exposes visible progress.

Pagurus remains a client. It must not open a private database, read Conchbase's private files, invent a second schema, store task content in browser storage, or expose provider credentials.

## Decision

Update the typed task client to accept Conchbase `0.3.0`'s `partialOutput: string | null` field and keep its exact payload validation. While a task is active, show `partialOutput` as a clearly labeled, live progress preview. On a terminal state, show only final `output`; ignore `partialOutput` even if a transient stale payload contains it. Keep polling with the existing cursor-free task reads; do not add SSE, `Last-Event-ID`, browser storage, or a second event client.

The UI must preserve `aria-live`, keyboard access, explicit loading/error/empty states, and narrow layouts. Progress text is untrusted model output and is rendered as text, not HTML. Use the same read-only API route and no new write route.

## Consequences

Pagurus becomes compatible with Conchbase's additive streaming task contract without becoming a second event consumer. `GET /v1/events` remains available to third-party clients and future Pagurus features, but this panel does not reconstruct output from deltas. A missed poll can show a temporarily stale `partialOutput`; the next poll or the terminal `output` is authoritative.

## Validation

- Client tests assert that `partialOutput` is part of the validated task shape and that malformed values are rejected.
- Panel tests assert visible progress while active, final-output precedence after success, and unchanged cancel/retry behavior.
- Repository guardrails still reject private-file access, browser storage, unaccepted write routes, and non-loopback proxy changes.
- Run `npm run check`, `npm test`, and `npm run build`. CI uses deterministic fake HTTP responses and no real model provider.
