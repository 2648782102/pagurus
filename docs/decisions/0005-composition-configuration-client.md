# Decision 0005: Bounded composition configuration client

Status: **accepted for the Conchbase 0.5.0 v1/v2 configuration revision UI**

Date: 2026-11-08 (Asia/Shanghai).

## Context

Conchbase [ADR 0014](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0014-versioned-configuration-api.md) publishes five `/v1/configuration` routes and a `schemaVersion: 1` document. [ADR 0016](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0016-composition-execution-and-public-schema.md) extends that contract to `0.5.0` with a `schemaVersion: 2` document that requires a topology-neutral public `composition` section. Conchbase validates the graph, derives terminal node ids and a `cmp_` identity, pins the document to each task, and runs a bounded deterministic executor. It exposes composition events through the existing durable event route and adds no new configuration write route.

Pagurus [ADR 0004](0004-versioned-configuration-client.md) accepts a typed v1 client and JSON revision editor. Its guardrails allow exactly the published task and configuration writes. A visual builder, second schema, generated client, role template, or hardcoded topology is not accepted.

## Decision

Extend `src/shared/api/configuration.ts` to mirror Conchbase `0.5.0` explicitly:

- accept `schemaVersion: 1` and `schemaVersion: 2` documents;
- keep all v1 base sections required, including `metadata`;
- validate the v2 `composition` section as user-authored fields `schemaVersion: 1`, `name`, `nodes`, `links`, `entryNodeIds`, and `metadata`;
- reject unknown fields, unsupported schema versions, derived composition fields, and malformed composition shapes at the HTTP response boundary;
- use only `POST /v1/configuration/validate` and `POST /v1/configuration/apply`, plus the existing reads and rollback shape.

The configuration panel remains a labeled JSON editor. It can read and edit v2 documents, but does not compute graph identity, validate graph reachability, render a visual builder, choose a topology template, or present one shape as canonical. Conchbase remains the only validator of graph semantics. The panel's help text says `schemaVersion 1 或 2` and that v2 requires the `composition-execution` runtime capability.

`useConfiguration` keeps `configuration-revisions` as the minimum read/apply capability. It records whether the runtime advertises `composition-execution`; if a v2 document is submitted to a runtime without that capability, it shows an explicit unsupported message before making a write. v1 documents remain usable on older `0.4.0` runtimes. The health API version guard remains `1` and is not a Runtime API version negotiation protocol.

## Non-goals

No generated client types, visual composition builder, graph canonicalization, `cmp_` computation, role/template defaults, model-driven composition display, event stream display, secret entry, MCP/Skill/plugin installation, approval workflow, remote pairing, SSE, or direct private-database access. No second schema: Pagurus mirrors Conchbase's request/response shapes explicitly.

## Consequences

The accepted write set remains exactly five published routes. Repository guardrails are updated in the same slice to accept this ADR and reject premature dependencies, browser storage, private-file imports, hardcoded topology names, and unaccepted configuration writes. Pagurus can now hand-edit a v2 composition document as versioned data; it still does not own execution or graph semantics.

Applying a v2 document changes Conchbase's active pointer for later tasks. Already-created tasks keep their pinned revision. The UI never keeps authoritative runtime state locally and never stores provider credentials or secret values.

## Validation

- Client tests use mocked `fetch` to assert v1/v2 response parsing, composition shape validation, v2 validate/apply payloads, exact routes, rollback shape, and mapped errors.
- Component tests cover connected, loading, unsupported capability, disconnected, validation failure, v2 apply/no-op, rollback, and keyboard states.
- Repository guardrails check ADR 0005 status, the unchanged five-write boundary, and representative synthetic violations.
- Run `npm run check`, `npm test`, and `npm run build`; CI uses no real credential, user data, public network, private database, real model, or real tool.
