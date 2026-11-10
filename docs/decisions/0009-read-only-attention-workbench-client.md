# Decision 0009: Read-only human-attention workbench client

Status: **accepted for the Conchbase 0.9.0 durable-work contract**

Date: 2026-11-11 (Asia/Shanghai).

## Context

Conchbase [ADR 0024](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0024-durable-work-domain-and-public-api.md) publishes `0.9.0`: four `/v1/work` routes, the `durable-work-contract` capability, deterministic Trigger intake, immutable Mandates, context-only Threads, open WorkItems, planned Assignments, pending Outbox records, observed DeliveryReceipts, and bounded work events. The current phase-1 `Task` contract remains intact.

[ADR 0008](0008-human-attention-workbench-proposal.md) proposed a workbench but deliberately left its client contract open. Pagurus now needs a small read-only surface that lets a person inspect durable work without becoming an execution authority. Conchbase [ADR 0023](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0023-secret-handle-and-runtime-injection-proposal.md) remains a proposal; no SecretHandle editor is accepted here.

## Decision

Pagurus adds a **read-only attention workbench** over exactly these published GET routes:

1. `GET /v1/work/items`
2. `GET /v1/work/items/{workItemId}`
3. `GET /v1/work/delivery-receipts`

It reads `/v1/runtime` through the existing status client and gates the workbench on `durable-work-contract`. The panel shows empty, loading, offline/error, unsupported-capability, and selected-item states. It renders WorkItem state, Thread context count, immutable Mandate scope/operations, planned Assignment pins, Outbox status/digests, and digest-only DeliveryReceipts. It does not reconstruct work events, define a second state model, paginate server-side, add live transport, or infer authorization.

The typed client mirrors Conchbase's published schemas explicitly. It may use the terms `WorkItem` and `DeliveryReceipt` as response shape names, but it must not create writable WorkItems, mutate a Mandate, call `POST /v1/work/triggers`, start/stop/resume/approve work, read SQLite, or show secret plaintext. Repository source continues to reject `SecretHandle`, `plaintextSecret`, `secretValue`, `resolveSecret`, and `decryptSecret`.

The workbench is topology-neutral. It shows Assignment `providerId/modelId` and pinned revision ids without naming Router/Worker, a layer count, role hierarchy, or coordination pattern. A `planned` Assignment is visibly distinct from an `open` WorkItem; a `pending` Outbox record and an `observed` DeliveryReceipt are shown as evidence, not proof of an external write or acceptance.

## Options

### A. Render a full WorkItem editor and Trigger form now

Consequences: more visible controls, but creates unaccepted client writes and risks a second execution authority. Rejected.

### B. Read Conchbase's SQLite file for richer history

Consequences: one query can show everything, but violates the private-state boundary and the single-owner database lock. Rejected.

### C. Read-only capability-gated workbench over published GET routes (recommended)

Consequences: narrow and explicit; clients see durable work without owning state or execution. Accepted.

## Non-goals and safeguards

- No POST/PUT/PATCH/DELETE helper in `src/shared/api/work.ts`; no `/v1/work/triggers` call.
- No browser storage, private-file imports, provider SDK, storage SDK, generated client, or new dependency.
- No SecretHandle editor, rotation, plaintext field, generic resolver, or decryptable token.
- No event reconstruction, SSE, server-side pagination/filtering, approval workflow, start/stop, or external write.
- No canonical role, layer, hierarchy, or topology vocabulary in UI text or source types.
- The current unsupported-version check remains a health endpoint guard, not a negotiated versioning protocol.

## Validation

- API client fixtures validate accepted response shapes and reject malformed versions, arrays, states, and digest-like records.
- Component fixtures cover loading, empty, offline/error recovery, unsupported capability, WorkItem selection, Mandate scope, Assignment pins, Outbox/DeliveryReceipt evidence, and absence of a secret sentinel.
- Repository guardrails accept only the published read-only work GET paths, expect ADR 0009, and keep SecretHandle/plaintext/executor boundaries forbidden.
- `npm run check`, `npm test`, and `npm run build` pass; no real credential, user data, public-network call, or external write is used.

## Consequences

`AGENTS.md`, handoff, README files, architecture, roadmap, validation plan, technology stack, and guardrails record the workbench as implemented and read-only. ADR 0008 remains a proposal for the wider attention and write-only SecretHandle direction. ADR 0009 does not change Conchbase or add a Runtime route. Future execution and SecretHandle UI slices require separate accepted client ADRs.
