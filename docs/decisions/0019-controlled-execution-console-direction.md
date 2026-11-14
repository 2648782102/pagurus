# Decision 0019: Controlled execution console direction

Status: **accepted paired client direction; no implementation**

Date: 2026-11-14 (Asia/Shanghai).

## Context

Pagurus ADR 0018 connects the Boss-mode organization console to Conchbase's completed `1.1.0` product loop. Conchbase ADR 0042 accepts controlled execution as the next product direction. The current console can read capability metadata and write-only SecretHandle records, but it must not imply that a record is installed, enabled, granted, or executable.

## Decision

1. Controlled execution UI is accepted as direction only. No installation, enablement, grant, approval, execution, or lifecycle control is implemented by this ADR.
2. Before connected UI is implemented, Conchbase must publish versioned contracts for grants, approvals, execution requests/results, audit events, cancellation, and revocation. Pagurus must accept one implementation ADR per client surface.
3. Pagurus may render published capability state, but it must clearly separate `recorded`, `enabled`, `granted`, `approved`, `running`, `succeeded`, `failed`, and `revoked`. A directory row is never an authority or execution control.
4. Any destructive or authority-changing action must require explicit confirmation, published expected version, and visible Runtime response. The client never computes authority locally.
5. SecretHandle plaintext must never enter browser storage, frontend bundles, URLs, logs, errors, or model context. The UI may render only key, metadata, digests, and bounded receipts.
6. Validation must include typed-client alignment, explicit pending/error states, stale-version conflict handling, keyboard/focus/reduced-motion/responsive checks, no private Runtime access, and a deterministic dual-repository fake-executor fixture.

## Options

### A. Add grant and execute buttons to existing capability rows

Consequences: turns metadata into authority and bypasses versioned Runtime contracts. Rejected.

### B. Simulate execution locally for a richer demo

Consequences: recreates mock-as-live and a second Runtime schema. Rejected.

### C. Wait for published contracts and gate UI by paired implementation ADRs

Consequences: slower but preserves Runtime authority and the no-second-schema invariant. Accepted.

## Consequences

Pagurus records controlled execution as the next ADR-gated direction. Until implementation ADRs and fixtures exist, current capability and SecretHandle surfaces remain configuration/read-only views.

> Paired direction only: this ADR does not create routes, write Runtime state, or execute capabilities.
