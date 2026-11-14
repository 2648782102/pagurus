# Decision 0027: Boss conversation in Agent Chat console

Status: **accepted paired client documentation boundary; no client or Runtime API contract changes**

Date: 2026-11-14 (Asia/Shanghai).

## Context

Pagurus ADR 0024 prefers the Runtime-owned 老板 Agent and ADR 0026 renders Runtime-published Agent Chat conversation states. Conchbase ADR 0049 gives that Agent natural model replies while preserving Runtime-only organization authority. The client already renders authorized Runtime messages through the continuous conversation thread.

## Decision

1. Pagurus continues to use the frozen four-path `1.5.0` Agent Chat contract and its published state vocabulary. It does not add a local reply generator, second transcript, organization authority computation, or provider/model configuration surface.
2. A natural Boss reply is rendered exactly like other `replied` assistant messages. `thinking`, `organizing`, `waiting_attention`, `failed`, and `unavailable` remain Runtime-published states with the existing labels.
3. The user does not choose whether a message invokes organization capabilities. Conchbase's Boss Agent decides; Runtime validates and commits every action. Pagurus only polls the resulting conversation and published organization facts.
4. Magpie or another OpenAI-compatible gateway remains user-configured outside Pagurus. No provider credential, raw provider envelope, private path, SecretHandle plaintext, or chain-of-thought enters the client.

## Options

### A. Add a client-side Boss chat prompt and local intent classifier

Consequences: creates a second source of truth and gives the client unintended authority. Rejected.

### B. Require an explicit capability toggle in the composer

Consequences: leaks Runtime implementation details and contradicts one natural conversation with the Boss. Rejected.

### C. Keep published Runtime messages authoritative

Consequences: existing UI supports natural replies with no contract change. Accepted.

## Validation

- Existing `tests/agent-chat-api.test.ts` and `tests/agent-chat-panel.test.tsx` keep the typed-client and state-rendering boundary.
- Both repositories pass `npm run check`, `npm test`, and `npm run build`.

## Consequences

The same Codex-style conversation supports ordinary Boss dialogue, Runtime-approved organization actions, and explicit failure states. Pagurus remains a client; Conchbase remains the execution authority.

> Implementation boundary: documentation and machine-readable status only; no client source or Runtime API contract changes.
