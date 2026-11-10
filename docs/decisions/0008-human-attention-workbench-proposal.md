# Decision 0008: Human-attention workbench and secret handle editor (proposal)

Status: **proposed, not accepted as a client contract**

Date: 2026-11-11 (Asia/Shanghai).

## Context

Pagurus currently manages independently customizable Agents and inspects bounded tasks. That is a configuration and operations console, not a surface for long-lived authorized work. Conchbase [ADR 0022](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0022-persistent-work-runtime-direction.md) accepts a product direction in which Sessions become implementation details and durable work identity, authorization, event history, and delivery evidence become product state. Conchbase [ADR 0023](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0023-secret-handle-and-runtime-injection-proposal.md) proposes one central, write-only secret handle registry with runtime-mediated use.

Neither Conchbase decision publishes a new Runtime API route or schema. Pagurus must not invent one, read Conchbase private files, or become a second execution authority. This record captures the matching client direction and keeps it visibly separate from implemented behavior.

## Proposed client direction

After Conchbase accepts and publishes its versioned contract, Pagurus should add a **human-attention workbench** beside the existing Agent workspace. It would surface work that needs a person to authorize, stop, resume, or accept, together with its Mandate scope, Trigger/Thread context, Assignment status, Outbox state, and DeliveryReceipt evidence. A stable WorkItem could remain visible across several execution attempts and client sessions. The workbench would not define work identity, authorization, event ordering, retention, or delivery semantics locally.

It should also offer a **write-only SecretHandle editor** after a separate Conchbase contract and local authorization/pairing boundary exist. Creation submits a sensitive value once and never reads it back. The editor may show handle key, version, purpose, allowed adapter/destination, grant, status, last-use time, and digest-only use receipts. It must never display a plaintext value, decryptable token, provider envelope, secret-like response field, or raw tool argument. Browser storage, URLs, logs, error telemetry, and the frontend bundle must not contain the value.

The Agent workspace remains topology-neutral. Router/Worker and layered role examples are not baked into navigation, forms, default templates, or labels. Pagurus continues to use provider-neutral model references and keeps Magpie as one compatibility path.

## Options

### A. Build client-side work and secret models now

Consequences: fast visible progress, but creates a second source of truth and risks putting durable state or plaintext secrets in browser code. Rejected.

### B. Wait for Conchbase contracts, then add paired vertical slices (recommended)

Consequences: slower, but preserves a single Runtime API contract, explicit authorization, and the no-plaintext boundary. Accepted as proposed direction only.

### C. Treat the workbench as a chat window with a secret input

Consequences: familiar UI, but Session becomes the product center again and a secret input can leak through state, logs, or form recovery. Rejected.

## Boundary and sequencing

1. Conchbase accepts a versioned domain/API ADR with deterministic fake Sources and an explicit authorization model.
2. Pagurus accepts its own workbench ADR for a read-only attention view over published routes; writes remain explicit and separately accepted.
3. Conchbase accepts a SecretHandle store, injector, redaction, and local authorization contract with no-leak fixtures.
4. Pagurus accepts a separate write-only editor ADR and uses only published routes. No plaintext read route may exist.
5. Accessibility, empty/offline/denied/rotated/recovery states, narrow layouts, and keyboard-only flows are validated for both features.

Real external Sources, executable approvals, SSE, server-side history queries, remote pairing, and a model-driven Watchdog remain later layers. Conformance and accessibility validation remain separate from deterministic Paired Runtime acceptance.

## Non-goals and safeguards

- No new `fetch` route, POST/PUT/PATCH/DELETE helper, browser storage, secret value field, generated client, or second task schema in this proposal.
- No UI reads private SQLite files, environment variables, OS keychains, provider envelopes, or secret files.
- Agent instructions, Skills, and UI selections never grant secret use or tool permissions. Installing, enabling, granting, and using remain separate.
- A ledger approval is not execution permission; a delivery receipt is distinct from a worker's `ready` state.
- Keep current implemented/roadmap labels truthful in `AGENTS.md`, handoff, README, architecture, validation, and guardrails.

## Validation before acceptance

- Conchbase OpenAPI owns every consumed request/response shape and error code.
- Deterministic fixtures prove Pagurus never receives or stores a secret sentinel and never invents a WorkItem or DeliveryReceipt shape.
- Component fixtures show offline, unsupported capability, denied, disabled, rotated, delivery-pending, and recovery states without revealing secrets.
- Pagurus runs `npm run check`, `npm test`, and `npm run build`; guardrails reject unaccepted writes, private-file imports, browser storage, and plaintext secret fields.
