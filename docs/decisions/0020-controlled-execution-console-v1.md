# Decision 0020: Controlled execution console v1

Status: **accepted paired client contract for Conchbase controlled execution v1**

Date: 2026-11-14 (Asia/Shanghai).

## Context

Conchbase ADR 0043 implements a deterministic fake-executor controlled execution slice with additive `1.2.0` paths. Pagurus ADR 0019 accepted controlled execution only as direction. A paired implementation ADR is now required so the console can consume grants, requests, decisions, results, and audit state without creating a second schema or treating configuration metadata as authority.

## Decision

1. Pagurus implements a `受控执行` workspace for the Conchbase `1.2.0` fake-executor contract. It gates on optional Runtime discovery fields `executionContract: "1.2.0"` and `executionPaths: 8`.
2. The typed client mirrors exact published request/response shapes. It does not infer capability state from existing `1.0.0` capability records or task/tool ledger data.
3. The console explicitly separates `recorded`, `enabled`, `granted`, `approved`, `running`, `succeeded`, `failed`, and `revoked`. A capability row is never shown as executable simply because it is recorded or enabled.
4. Pagurus may submit explicit grant creation, grant revocation, execution request creation, and request decision through published `1.2.0` routes. It passes expected versions from Runtime-published facts, never computes authority or version locally, and handles `409` stale-version conflicts visibly.
5. The console renders only bounded digests and opaque ids. It never displays raw arguments, plaintext SecretHandle values, local machine paths, generic resolver tokens, or model instructions.
6. `202`/`201` acceptance and asynchronous execution are explicit UI states. The client refreshes published grants, requests, and events after a write. It never presents local optimistic state as Runtime truth.
7. Real MCP/Skill/plugin lifecycle, host tool execution, external Sources, external writes, and secret injection UI remain blocked. Conchbase ADR 0043's fake executor is the only execution backend accepted here.
8. Validation includes typed-client schema fixtures, capability/grant/request/decision/revoke flows, stale-version handling, event audit rendering, no second schema, no private Runtime access, keyboard focus, reduced motion, and narrow layouts. Both repositories must pass `npm run check`, `npm test`, and `npm run build`.

## Options

### A. Add grant/execute buttons to the existing capability directory

Consequences: conflates recorded metadata with explicit grants and bypasses the versioned execution contract. Rejected.

### B. Simulate results locally

Consequences: creates mock-as-live state and a second authority. Rejected.

### C. Build a dedicated typed workspace over the published fake-executor contract

Consequences: more code and fixtures, but preserves Runtime ownership and explicit state vocabulary. Accepted.

## Consequences

Pagurus can now supervise controlled execution v1: grants, approvals, deterministic outcomes, revocations, and audit events. Real capability lifecycle and host execution remain future ADR-gated work.

> Paired client contract: this ADR covers only Conchbase ADR 0043's deterministic fake-executor slice.
