# Decision 0016: Organization Console delivery boundary

Status: **accepted paired client delivery direction; no client or Runtime API contract changes**

Date: 2026-11-13 (Asia/Shanghai).

## Context

Pagurus ADR 0015 accepts the Organization Console product direction. Conchbase ADRs 0030–0034 and the Chinese [Organization Runtime target](../../../ORGANIZATION_RUNTIME_TARGET.zh-CN.md) define the long-range runtime objective and contract gates. Conchbase ADRs 0035–0036 add internal persistence and execution/reporting boundaries only. The client needs its own delivery boundary so later models know what to build, what to wait for, and what must never be implemented locally.

## Decision

### 1. Final client surfaces

The Organization Console target includes these surfaces once the Runtime publishes the required contracts:

- **Primary Conversation**: the single user entry point.
- **Attention Overview**: concrete questions, failures, blocked work, and required decisions first.
- **Project Tree**: active, quiet, archived, stopped, and resumed projects.
- **Delegation / Worker Inspector**: published Agent revision, authorizer, scope, budget, TTL, status, and WorkItem links.
- **Report / Archive View**: structured reports and historical ProjectThreads.
- **Audit / Event View**: bounded organization events with opaque references.

Exact workspace placement is deferred. The surfaces must not become multiple user-maintained sessions.

### 2. Client authority boundary

Pagurus may:

- render published state;
- submit bounded published commands;
- show confirmation before destructive or authority-changing actions;
- keep local UI preferences that do not affect Runtime semantics;
- build non-authoritative fixtures from documented schemas.

Pagurus may not:

- read or write Conchbase private files or databases;
- create Agent revisions locally;
- calculate Delegation inheritance;
- decide Project archive or resume eligibility;
- infer human-waiting state from text;
- present local mocks as live state;
- expose SecretHandle plaintext;
- create a second Agent/task/work/configuration schema.

### 3. Attention-first interaction

The panel must answer in order:

1. What needs me now?
2. Is the organization healthy and doing the right things?
3. What is the complete history of one project or delegation?

Healthy background work must be quiet. Counts must match the lists they link to. Labels must be derived from structured state, not model prose.

### 4. Published contract gate

No connected organization UI may ship before the corresponding Conchbase public contract and paired Pagurus client ADR are accepted. Before that gate, only documentation and clearly marked non-authoritative fixtures are allowed.

All typed clients must align with the published contract. Generated types require a separately accepted stable schema decision.

### 5. Required client fixtures

The final delivery must include executable fixtures for:

- primary conversation vs ProjectThread boundary;
- attention ordering and one-question-at-a-time rendering;
- worker/delegation inspector read-only behavior;
- archive/report browsing;
- destructive action confirmation;
- no private Runtime access;
- no second schema;
- keyboard focus, reduced motion, and narrow/wide responsive rules;
- typed-client alignment with the published organization contract.

## Options

### A. Build connected UI against local guesses

Consequences: visual progress, but creates a second schema and likely incorrect authority semantics. Rejected.

### B. Wait for the Runtime with no preparation

Consequences: avoids wrong contracts, but leaves later implementation underspecified. Rejected.

### C. Define the delivery boundary now and gate connected work on published contracts

Consequences: preserves client authority boundaries while giving later models a concrete target. Accepted.

## Consequences

The Organization Console now has a concrete delivery target and a strict publication gate. This ADR does not add routes, workspaces, components, client methods, or connected UI behavior.

> Paired client delivery direction only: this ADR does not make any organization client capability available.
