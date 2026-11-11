# Decision 0011: Paired AI handoff readiness development boundary

Status: **accepted repository development boundary; no client or Runtime API contract changes**

Date: 2026-11-11 (Asia/Shanghai).

## Context

Pagurus ADR 0010 closes the paired final local-first `1.0.0` client over Conchbase's exact 47-path public contract. The repository now contains a long historical handoff, a roadmap, and validation prose, while several future surfaces depend on unaccepted Runtime security and API contracts. A later coding model must be able to distinguish current client behavior from validation evidence and from direction that is blocked until a new ADR.

Conchbase [ADR 0026](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0026-ai-handoff-readiness-development-boundary.md) accepts a repository-internal handoff packet without changing the public contract. Pagurus needs the paired client-side boundary and the same machine-readable classification.

This ADR changes no Pagurus write route, typed client, feature state, browser storage rule, capability gate, or UI behavior. It does not accept a visual composition editor, tool approval UI, remote pairing UX, executable capability lifecycle, SSE, generated client types, or production secret custody.

## Options

### A. Keep the historical prose queue and wait

Consequences: no artifact changes, but a weaker coding model must infer current scope from long prose and could implement a blocked Runtime-dependent feature as if it were accepted. Rejected.

### B. Add a new panel that appears useful

Consequences: visible UI work without an accepted Conchbase contract; risks creating a second schema, a premature write route, or a plaintext path. Rejected.

### C. Add a paired status index, Chinese objective brief, and executable guardrails

Consequences: a small documentation and test slice that preserves all boundaries while making the next bounded task explicit and checkable. Accepted.

## Decision

1. `docs/PROJECT_STATUS.json` is the machine-readable current-state index for Pagurus. `docs/OBJECTIVE_MODE.zh-CN.md` is the Chinese target-mode brief.
2. Every status file uses JSON arrays named `implemented`, `validationEvidence`, and `blockedDirections`. Only `implemented` records describe current behavior. Every `blockedDirections` record sets `requiresAcceptedAdr: true`.
3. The status index records the paired repositories, the frozen 47-path Runtime contract, accepted ADR 0010, the published client surfaces, and the requirement that new Runtime operations be accepted in Conchbase before Pagurus changes.
4. `docs/AI_HANDOFF.md`, `docs/AI_DEVELOPMENT.md`, `README.md`, `README.zh-CN.md`, and `docs/QUICK_START.zh-CN.md` link the objective brief and status index. The `v1.0.0` release notes and attached Release assets remain an immutable publication snapshot and do not link post-release artifacts. Chinese documents remain reading entry points; English documents, Conchbase OpenAPI, and accepted ADRs remain the source of truth.
5. `docs/PROJECT_STATUS.json`'s `aiEntry.requiredOrder` is the canonical AI reading order. `tests/repository-guardrails.test.ts` parses the status JSON, checks the classification, ADR gates, consistent `nextBoundedSlices` gating, links from the entry documents, and a sequential numbered reading order. It is updated in the same slice as this accepted development-boundary ADR.

## Executable boundary

- Run `npm run check`, `npm test`, and `npm run build`.
- Add no dependency, private-runtime import, browser storage, new write route, generic secret resolver, credential, user data, or machine-specific path.
- Keep all existing capability gates, one-shot SecretHandle clearing, no-plaintext UI rules, and loopback Vite proxy unchanged.
- Guardrail fixtures reject a blocked direction marked as implemented and a missing accepted-ADR gate.

## Consequences

A later coding model can identify a bounded client slice from repository state instead of chat history. The cost is a small, explicitly typed status file and one Chinese brief. No product capability is silently accepted and the paired `1.0.0` contract remains frozen.

> Development boundary only: this ADR does not reopen the final local-first `1.0.0` client target or make any deferred capability implemented behavior.
