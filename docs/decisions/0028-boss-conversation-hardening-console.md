# Decision 0028: Boss conversation hardening in the Agent Chat console

Status: **accepted paired client documentation boundary; no client or Runtime API contract changes**

Date: 2026-11-14 (Asia/Shanghai).

## Context

Conchbase ADR 0050 separates pure Boss conversation from organization execution and publishes real `streaming` progress. Pagurus ADR 0027 established that the console renders Runtime-published Boss messages without local authority. The live UI still described every Boss message as intent submission and labeled model waiting as organization work.

## Decision

1. Pagurus keeps the frozen four-path `1.5.0` contract and existing message fields. It adds no local reply generator, transcript store, organization authority, provider configuration, or second schema.
2. Boss copy states three facts plainly: the Boss is a normal conversation partner; organization actions are validated by Runtime when needed; web search, local files, and device query are not currently connected.
3. `organizing` is labeled “正在执行组织动作…” because it now appears only after Runtime has accepted an organization action. Model waiting uses `thinking` or `streaming`.
4. `streaming` progress is rendered from Runtime-published `progress`; Pagurus never invents partial text or progress.

## Options

### A. Add client-side intent classification or reply synthesis

Consequences: creates a second authority and can diverge from Runtime. Rejected.

### B. Keep the old intent-submission copy

Consequences: misleads users into thinking every chat mutates organization state. Rejected.

### C. Render the hardened Runtime states with accurate copy

Consequences: natural conversation, organization actions, and capability boundaries are honest without a contract change. Accepted.

## Validation

- `tests/agent-chat-panel.test.tsx` covers the updated organization label, natural-conversation copy, capability boundary, and streaming rendering.
- Both repositories pass `npm run check`, `npm test`, and `npm run build`.

## Consequences

Pagurus remains a published-state renderer. Users see natural conversation and real progress without a second execution path.
