# Decision 0032: Execution mode in the console

Status: **accepted and implemented execution mode display**

Date: 2026-11-15 (Asia/Shanghai).

## Context

Conchbase ADR 0068 adds a runtime-wide `executionMode` to `GET /v1/runtime`. In restricted mode a write or external tool pauses for approval; in unrestricted mode every granted tool runs immediately.

Without a console surface, an operator running in unrestricted mode sees tools execute with no approval requests and cannot tell whether the runtime is unrestricted or whether the Agent simply never called anything consequential. Those two states look identical from the outside, and one of them is materially more dangerous.

## Decision

1. The runtime panel renders `executionMode` whenever the Runtime publishes it. Older runtimes that omit the field render nothing extra rather than guessing a mode.
2. Restricted mode is labelled as requiring approval for write and external operations. Unrestricted mode is labelled as executing tools without approval and carries a distinct visual weight, because it is a standing trust assumption rather than a transient state.
3. The console never infers the mode from observed approvals. An Agent with no consequential tools produces no approvals in either mode, so inference would be wrong exactly when it matters.
4. The console does not offer a toggle. The mode is fixed by the Runtime process environment; a client cannot widen or narrow it, and a control that appeared to do so would be lying.
5. This is additive and gated on the `execution-modes` capability string. No new Runtime route.

## Options

### A. Show nothing

Consequences: unrestricted mode is indistinguishable from a quiet restricted run. Rejected.

### B. Add a client-side mode switch

Consequences: implies a client can change Runtime authority, which ADR 0068 forbids. Rejected.

### C. Display the published mode, read-only

Consequences: the operator can see the standing trust assumption; authority stays with the Runtime process. Accepted.

## Validation

- `src/shared/api/runtime.ts` accepts the optional `executionMode` without breaking older runtimes.
- `src/features/runtime-status/RuntimeStatusPanel.tsx` renders the mode label and only when published.
- `npm run check`, `npm test` (126), and `npm run build` pass.

## Consequences

An operator always knows which execution policy is in force. The console stays a read-only view of Runtime state, and the decision to run unrestricted remains an environment-level choice made outside any model's reach.
