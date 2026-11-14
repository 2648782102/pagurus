# Decision 0018: Boss Mode Console product loop

Status: **accepted paired client contract for the completed Boss-mode product loop**

Date: 2026-11-14 (Asia/Shanghai).

## Context

ADR 0017 accepted a typed organization client and authority boundary, but the first console slice still computed an `expectedSequence` locally and treated the Runtime as a synchronous state writer. Conchbase ADR 0041 establishes the full primary-conversation loop: text intents are idempotent, the Runtime parses and executes asynchronously, and clients read published organization facts and events.

## Decision

1. Pagurus submits primary-conversation text with only a client-generated idempotency key. It does not compute organization sequence, project state, Delegation inheritance, archive eligibility, or worker authority.
2. `202` means the Runtime accepted the text. The UI says the intent is accepted and polls published session/events/report/attention state. It never presents a local projection as live organization state.
3. Pagurus gates organization capability through optional `organizationContract: "1.1.0"` and `organizationPaths: 18` from `GET /v1/runtime`. It treats session responses without raw events as authoritative and reads bounded facts from `/v1/organization/events`.
4. Attention ordering and stale-version handling remain UI responsibilities, but all expected versions come from Runtime-published AttentionRequest views. The console never invents attention state from prose.
5. Project threads, reports, events, worker proposals, Delegations, and WorkItems remain read-only published views. The console does not call lifecycle command paths or write private state.
6. A deterministic dual-repository live loopback fixture must drive the Pagurus typed organization client against a credential-free fake provider and the real Conchbase Runtime. It must cover multiple projects, concurrent work, one attention answer, and one archive/resume path.

## Options

### A. Keep local sequence derivation and local state simulation

Consequences: simpler UI, but conflicts with asynchronous Runtime authority and creates a second schema. Rejected.

### B. Add client-side lifecycle commands

Consequences: makes Pagurus an orchestrator and bypasses the one-primary-conversation design. Rejected.

### C. Submit bounded text and read published facts only

Consequences: requires polling and explicit pending states, but preserves Runtime authority and the single conversation entry point. Accepted.

## Validation

- typed-client alignment with the corrected `1.1.0` OpenAPI schemas;
- no `expectedSequence` in submit-intent calls;
- no route or local computation that changes organization authority;
- explicit accepted/pending/error states after `202`;
- deterministic dual-repository fake-provider fixture;
- `npm run check`, `npm test`, and `npm run build` pass.

## Consequences

Pagurus becomes the connected console for the full Boss-mode loop without owning Runtime state.

> Paired client contract: this ADR accepts the console boundary for Conchbase ADR 0041.
