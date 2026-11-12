# Decision 0017: Organization Console public contract boundary

Status: **accepted paired client contract direction; no connected organization UI is implemented**

Date: 2026-11-13 (Asia/Shanghai).

## Context

Pagurus ADRs 0015–0016 accept the Organization Console product and delivery direction. Conchbase ADR 0038 accepts an additive `1.1.0` organization Runtime contract with eighteen paths, but its implementation slice is not complete. A paired client ADR must fix how Pagurus will consume that contract so later models do not invent routes, local authority, a second schema, or mock-as-live behavior.

## Decision

### 1. Published contract only

Pagurus must consume the Conchbase `1.1.0` organization contract from `docs/openapi.yaml`. The typed client must mirror published request/response shapes explicitly. It must not generate, infer, or hand-maintain a competing schema, and it must not map organization facts onto Task, WorkItem, or configuration shapes merely to render a screen.

The `1.0.0` 47-path contract remains usable for existing client surfaces. The organization client must gate on published Runtime capability and version discovery, not on a URL guess.

### 2. Client surfaces

Implementation may proceed only after the Runtime routes exist and this ADR remains accepted:

- **Primary Conversation**: submit bounded user intents and show Runtime-published relays; do not create local threads for projects or workers.
- **Attention Overview**: open AttentionRequests first, with answer/withdraw commands using published expected versions.
- **Project Inspector**: read-only project state, thread references, and audit facts; no local lifecycle computation.
- **Worker / Delegation Inspector**: read opaque Agent proposal audits, Delegations, scopes, capabilities, budgets, TTLs, and status. It never proposes capability escalation or creates local Agent revisions.
- **Reports and Archive**: read structured reports and archived project history; distinguish structured facts from free text.
- **Organization Events**: read bounded cursor pages and clearly distinguish live published state from fixtures.

### 3. No second Runtime schema and authority boundary

Pagurus renders published facts and submits bounded intents. It must not:

- compute Delegation inheritance or decide archive/resume eligibility;
- treat an Agent proposal as an active revision;
- infer `waiting_on_human`, blocked, or ready from prose;
- read or write Conchbase private files or database;
- store SecretHandle plaintext, runtime state, or credentials in browser storage, URLs, bundles, logs, or errors;
- present fixture data as live;
- add boss/HR/employee role enums or a canonical organization chart.

ProjectThread views are inspectable details of the single primary conversation, not additional user sessions.

### 4. Error and state handling

The client must surface explicit states for unsupported organization contract, unavailable Runtime, validation error, auth failure, stale expected version, conflict, and missing opaque id. `202` intent acceptance is not project creation success; the UI must say the intent was accepted and await published state. Attention answer/withdraw must require the current expected version and visibly handle `409`.

### 5. Fixtures and validation

Before connected UI is called complete, Pagurus must have executable fixtures for:

- typed-client alignment with the exact `1.1.0` path set;
- primary conversation and ProjectThread boundary;
- attention ordering and stale-version conflict handling;
- read-only worker/delegation/report/archive rendering;
- destructive or authority-changing command confirmation where applicable;
- no private Runtime access;
- no second schema and no mock-as-live claim;
- keyboard focus, reduced motion, and responsive layout.

Fixtures created before Runtime implementation are non-authoritative documentation aids only.

## Options

### A. Build organization UI from local mocks before Runtime routes exist

Consequences: useful exploration, but high risk of shipping invented semantics as live behavior. Rejected as connected implementation; static fixtures remain allowed.

### B. Wait only for Conchbase ADR 0038

Consequences: contract shape exists, but client semantics remain implicit and each UI model could invent behavior. Rejected.

### C. Accept a paired typed-client and UI authority boundary now

Consequences: both repositories share one contract and client work can be gated by implementation evidence. Accepted.

## Consequences

Pagurus now has the paired ADR required by Conchbase ADR 0038 and its own ADR 0016. Connected implementation still requires the Runtime route slice and the validation fixtures above; this ADR alone adds no UI or client route.

> Paired client contract direction only: this ADR does not implement organization UI or create a second Runtime schema.
