# Decision 0010: Final local-first v1.0.0 client contract

Status: **accepted final paired client contract for Conchbase 1.0.0**

Date: 2026-11-11 (Asia/Shanghai).

## Context

Pagurus ADR 0009 accepted a read-only attention workbench over Conchbase `0.9.0`. ADR 0008 proposed work controls and a write-only SecretHandle editor but did not publish a client contract. Conchbase ADR 0025 now publishes the final local-first `1.0.0` contract: 47 unique OpenAPI paths, authentication/pairing metadata, asynchronous work control and recovery, one local Source, a capability directory, and write-only SecretHandles with process-scoped sealed values, restart invalidation, and digest-only use receipts. The user requested one final target rather than staged milestones.

## Decision

Pagurus adds a capability-gated control workbench, capability directory, and write-only handle editor over only Conchbase's published `1.0.0` routes. It remains an API client; Conchbase owns work identity, state transitions, authorization, capability semantics, and secret handling. CLI, IDEs, and other clients remain valid.

### Workbench

The workbench reads `GET /v1/work/items`, `GET /v1/work/items/{workItemId}`, `GET /v1/work/delivery-receipts`, and `GET /v1/work/events`. It submits explicit `start`, `stop`, `complete`, `reconcile`, and delivery `decision` requests through the published routes. It shows version-2 widened WorkItem/Assignment/Outbox/Receipt states, bounded evidence events, and recovery states. It does not reconstruct canonical work state locally, infer delivery, create Triggers, call a model, execute a tool, or read private runtime files.

### Capability directory

A new panel lists and upserts bounded `mcp | skill | plugin | secret-handle` directory records using `GET/POST /v1/capabilities`. Records are displayed as configuration data with status and descriptor. The UI does not install code, grant permissions, load Skills, connect MCP servers, or execute plugins.

### Write-only SecretHandle editor

A new panel submits one sensitive `value` once through `POST /v1/secret-handles`, rotation, and status routes. The form clears `value` immediately after submission and never reads it back. It renders only handle keys, versions, digests, purpose, adapter/destination binding, status, and timestamps. `GET /v1/secret-handles/use-receipts` renders digest-only receipts. There is no value viewer, decryptable token, resolver, plaintext response field, URL value, browser storage, or secret telemetry.

### Paired boundaries

- The typed client mirrors Conchbase's exact version-2 schemas and validates response shapes at the API boundary.
- Existing `/v1/work` read clients move from version 1 to version 2 and accept widened state enums; they do not define a second WorkItem schema.
- All new writes are explicit POST helpers over published paths. No private SQLite, provider SDK, storage SDK, generated client, or new UI dependency is added.
- Runtime capability gating remains explicit. `durable-work-contract` gates work reads and delivery decisions, `asynchronous-work-control` gates start/stop/complete/reconcile, `local-source-policy` gates local Source events, `capability-directory` gates the directory panel, and `write-only-secret-handles` gates the handle editor. Unsupported, checking, loading, empty, offline/error, denied, disabled, rotated, recovery, and unsupported-state paths are visible.
- Navigation for tools/connections, Skills, settings, and the new capability/SecretHandle surfaces becomes live rather than planned.
- The workspace remains topology-neutral. Router/Worker, three-layer roles, hierarchies, and canonical coordination patterns are not UI defaults, labels, or templates.

## Options

### A. Keep the read-only workbench and placeholders

Consequences: low risk, but leaves Pagurus unable to configure the final `1.0.0` Runtime. Rejected.

### B. Create a local client-side work/secret state model

Consequences: faster UI, but creates a second source of truth and risks plaintext secrets in browser state. Rejected.

### C. Mirror the published 1.0.0 Runtime contract with bounded client writes (recommended)

Consequences: more endpoints to validate, but preserves one authority, one schema, and the write-only no-leak boundary. Accepted.

## Validation

- API client fixtures cover version-2 work reads, control writes, Source events, capability upserts, SecretHandle create/rotate/status/use, and digest-only use receipts; malformed versions, states, arrays, and HTTP errors are rejected.
- Component fixtures cover control actions, capability records, editor clearing, no plaintext display/read, digest-only receipts, unsupported capability, offline/error, empty, disabled, denied, rotated, and recovery states.
- Repository guardrails accept ADR 0010, the exact published routes, and no private-file/browser-storage/plaintext/executor violations.
- A sentinel submitted through the editor is absent from DOM, component state serialization, browser storage, URLs, logs, errors, and client responses.
- `npm run check`, `npm test`, and `npm run build` pass in both repositories; no real credential, user data, public-network call, or external write is used.

## Consequences

`AGENTS.md`, handoff, development guide, architecture, technology, roadmap, validation plan, README files, SECURITY, App navigation, workspace list, guardrails, and tests record the final paired `1.0.0` client boundary. ADR 0008 remains a historical proposal; ADR 0009 remains the accepted read-only slice that this ADR extends. No remaining planned item from the final local-first target is left unimplemented.
