# Decision 0021: Isolated execution console v2

Status: **accepted paired client contract for Conchbase isolated execution v2**

Date: 2026-11-14 (Asia/Shanghai).

## Context

Conchbase ADR 0044 implements isolated local execution v2: deterministic child-process execution, durable run state, explicit start/cancel/recover, restart interruption, and digest-only audit. Pagurus ADR 0020 covers only the `1.2.0` fake-executor grant/request surface.

The console must now expose run state without becoming an orchestrator. It may create a bounded run from an approved request, start/cancel/recover using Runtime-published expected versions, and read run events. It must not choose arbitrary operations, compute authority, display raw arguments, or claim that an interrupted run completed.

## Decision

1. Pagurus gates isolated execution runs on optional Runtime discovery `executionRunContract: "1.3.0"` and `executionRunPaths: 8`, while continuing to accept `executionContract: "1.2.0"` for grants and requests.
2. The typed client mirrors the exact `1.3.0` run, adapter, and event response shapes. It does not create a second schema or infer run state from `1.2.0` request state.
3. The console explicitly renders `queued`, `running`, `succeeded`, `failed`, `cancelled`, and `interrupted`. It shows digest-only results, bounded exit metadata, attempt, expected version, and run event cursor state.
4. Run creation, start, cancel, and recovery are explicit user actions through published routes. All expected versions come from Runtime-published run facts; stale-version `409` and idempotency `409` are visible errors, not local optimistic corrections.
5. The console never renders raw arguments, plaintext SecretHandle values, local machine paths, provider credentials, arbitrary commands, URLs, or generic resolver tokens.
6. `1.2.0` fake-executor surfaces remain available. A `1.3.0` run is visually marked as isolated local execution: deterministic bounded operations, no external write, no host tool, no MCP/Skill/plugin lifecycle.
7. Validation includes typed-client fixtures, run list/detail/events, start/cancel/recover transitions, stale-version handling, no second schema, no private Runtime access, keyboard focus, reduced motion, and narrow layouts. Both repositories must pass `npm run check`, `npm test`, and `npm run build`.

## Options

### A. Reuse the `1.2.0` request panel and label success after approval

Consequences: hides process execution, crashes, cancellation, and recovery. Rejected.

### B. Let the UI choose arbitrary local operations

Consequences: turns the console into a host command surface and bypasses Runtime allowlists. Rejected.

### C. Add a dedicated typed run panel over published `1.3.0` facts

Consequences: more fixtures, but preserves Runtime authority and makes process state visible. Accepted.

## Consequences

Pagurus can supervise deterministic isolated local execution v2. Real external tools, external writes, and MCP/Skill/plugin lifecycle remain blocked.

> Paired client contract: this ADR covers only Conchbase ADR 0044's isolated local deterministic execution slice.
