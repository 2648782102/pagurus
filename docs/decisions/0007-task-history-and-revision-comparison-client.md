# Decision 0007: Task history and Agent revision comparison client

Status: **accepted for the Pagurus read-only task history and revision comparison slice**

Date: 2026-11-10 (Asia/Shanghai)

## Context

Conchbase already publishes `GET /v1/tasks`, which returns persisted tasks together with the active runtime configuration revision. Agent-backed task responses already carry the immutable Agent revision, runtime configuration revision, and effective provider/model selected by Conchbase. Legacy tasks may omit Agent fields and must remain inspectable.

Pagurus needs a way to inspect more than the currently running task and to understand how an Agent changed over time. The client must keep Conchbase authoritative for task state, revision identity, and model selection. Magpie remains a compatibility adapter that can appear in an effective model value; it is not a Pagurus schema or the product's provider boundary.

## Decision

- Add a typed, validated `listTasks` client for the existing `GET /v1/tasks` response. Do not add a Runtime route, query parameters, pagination contract, or second task schema.
- Add a task history panel that displays the returned task list, active runtime configuration revision, state filtering, Agent/legacy filtering, selection, and details for the selected task.
- Preserve legacy tasks without `agentId`, `agentRevisionId`, `providerId`, or `modelId`. Display their existing model field and identify them as legacy Runtime tasks.
- Display the server-pinned Agent revision, runtime configuration revision, and effective provider/model for Agent-backed tasks. Do not recompute or infer any of these values in the browser.
- Add a read-only Agent revision comparison using the revisions already returned by the Agent detail route. Compare name, instructions, provider/model, and revision id; mark changed and unchanged values; do not write a revision or create a diff artifact.
- Keep both features in feature-local React state. Do not persist selection, task content, revision content, or credentials in browser storage.
- Keep task history polling-free for this slice: refresh is explicit, and live task progress continues to use the existing task operations panel. Do not add SSE, event cursor handling, or event reconstruction.
- Keep the existing legacy task flow, Agent task flow, configuration editor, cancel, retry, and runtime capability fallback unchanged.

## Alternatives considered

1. Add a new history-specific Runtime endpoint with server-side filtering and pagination. Deferred because the current local Runtime already publishes a complete task list and the server contract needs a separate capacity, ordering, retention, and cursor decision.
2. Read task history or revisions from Conchbase's SQLite database. Rejected because Conchbase owns persistence and Pagurus is an API client.
3. Reconstruct history from event records or add SSE. Deferred until Conchbase accepts event retention, cursor, reconnect, and live client semantics.
4. Make revision comparison editable or automatically roll back a selected side. Rejected because comparison must remain a safe read-only inspection surface; existing rollback remains an explicit Agent operation.
5. Treat Magpie fields as the Agent model contract. Rejected because Magpie is one compatibility adapter and future providers must fit the provider-neutral Runtime API.

## Consequences

Pagurus can inspect mixed Agent and legacy task records and compare immutable Agent revisions without changing Conchbase's public contract or execution behavior. The current history view is suitable for the local Runtime's complete list and is not a production-scale query surface: it has no server-side filters, pagination, retention policy, or live stream. A later slice must accept those Runtime contracts before expanding the client.

The revision comparison is intentionally field-level and read-only. It does not calculate a semantic patch, persist user preferences, or alter the immutable history. Existing Agent selection, editing, rollback, task creation, configuration revision handling, and legacy fallback remain authoritative and operational.

## Validation

- API tests validate `GET /v1/tasks`, the active configuration revision, Agent fields, legacy omissions, and malformed task-list responses.
- Component tests cover mixed task records, state and Agent filters, empty results, refresh failures, refreshed selection changes, task detail pins, and partial output/error display.
- Agent workspace tests cover changed and unchanged revision fields and the same-revision guard.
- Repository guardrails assert that task history uses the read-only list route, contains no task write method, adds no browser storage, and does not introduce another Runtime schema or dependency.
- Run `npm run check`, `npm test`, `npm run build`, and `git diff --check` with Node.js 24.
- A manual/visual validation pass against a real local Runtime and the user's configured Magpie gateway used a temporary database, two Agents, two immutable revisions, mixed Agent/legacy tasks, state/Agent filters, explicit refresh, offline refresh error/recovery, read-only revision comparison, and a 320px viewport. One selected model returned HTTP 429 and was visible as a failed-task record. This is screen evidence for the read-only slice, not automated real-provider conformance, accessibility validation, remote pairing, or production-scale history testing.
