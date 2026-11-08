# Decision 0004: Versioned configuration revision client

Status: **accepted for the Conchbase 0.4.0 configuration revision UI**

Date: 2026-11-08 (Asia/Shanghai).

## Context

Conchbase [ADR 0014](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0014-versioned-configuration-api.md) publishes five `/v1/configuration` routes in its `0.4.0` OpenAPI contract: active revision, revision history, one revision document, validation, and apply/rollback. The accepted document carries `schemaVersion: 1`, required sections including `metadata`, and bounded opaque references. `source: url` is not accepted. The document does not install, enable, grant, resolve secrets, load code, or define a topology.

Pagurus [ADR 0002](0002-phase-one-task-operations.md) previously allowed only task creation, cancel, and retry writes. Its guardrails reject configuration writes and its workspace rows remain visibly planned. The API source of truth remains in Conchbase; this client must not define a second schema.

## Decision

Add a typed `configuration` API client that validates every response at the HTTP boundary and calls exactly the published Conchbase `0.4.0` routes. Add a configuration revision panel that:

- reads the active document and newest-first history;
- treats a missing `configuration-revisions` capability in `/v1/runtime` as an unsupported runtime state;
- edits the document as JSON in a labeled textarea with explicit validation feedback from `/v1/configuration/validate`;
- applies a validated complete document and reports `changed: false` as a no-op;
- rolls back to a selected known revision through `/v1/configuration/apply` with `{ rollbackTo }`;
- keeps loading, disconnected, unsupported, validation-error, applied, rollback, and empty states explicit;
- preserves keyboard access, visible focus, reduced-motion behavior, and narrow layouts.

The panel is a revision editor, not an Agents/MCP/Skills/plugin installer. It does not claim that references are active capabilities, does not store data or secrets in browser storage, and does not put credentials in URLs, logs, bundles, or Git. The client continues to check health API version `1`; it does not treat the runtime document version as a second negotiation protocol.

## Non-goals

No generated client types, file import/export, visual composition builder, role/template defaults, secret entry, MCP/Skill/plugin installation, approval workflow, remote pairing, SSE, or direct private-database access. No second schema: Pagurus mirrors Conchbase's request/response shapes explicitly.

## Consequences

The accepted write set grows from three task writes to five documented writes: the original three plus `POST /v1/configuration/validate` and `POST /v1/configuration/apply`. Repository guardrails are updated in the same slice to allow exactly these routes and keep rejecting arbitrary `/v1/config` writes, browser storage, private-file imports, credentials, and non-loopback proxy targets.

Applying a document changes Conchbase's active pointer for later tasks; already-created tasks keep their pinned revision. Pagurus presents history and active revision from the runtime and never keeps authoritative state locally.

## Validation

- Client tests use mocked `fetch` to assert paths, methods, payload validation, validation-error details, rollback shape, and exact response parsing.
- Component tests cover connected, loading, unsupported capability, disconnected, validation failure, successful apply/no-op, rollback, and keyboard states.
- Repository guardrails check the accepted five-write boundary and representative synthetic violations.
- Run `npm run check`, `npm test`, and `npm run build`; CI uses no real credential, user data, public network, or private database.
