# Decision 0023: Agent Chat console

Status: **accepted paired client contract for Conchbase Agent Chat**

Date: 2026-11-14 (Asia/Shanghai).

## Context

Pagurus ADR 0022 connects the Boss-mode primary conversation as a Runtime-fact projection. That is not a normal Agent chat: users cannot select a configured Agent and receive a natural-language model reply. Conchbase ADR 0046 adds an independent `1.5.0` Agent Chat module that reuses Agent profiles, immutable revisions, and Agent-backed tasks over the existing OpenAI-compatible Magpie protocol path.

Pagurus needs a separate workspace so the two product meanings stay clear: organization main conversation is Boss orchestration and published facts; Agent Chat is a direct conversation with one configured Agent.

## Decision

1. Pagurus gates the Agent Chat workspace on optional Runtime discovery `agentChatContract: "1.5.0"` and `agentChatPaths: 4`.
2. A typed client mirrors the exact `1.5.0` Agent list, conversation, and message response shapes. It does not generate client types from an unaccepted schema or infer authority locally.
3. The workspace provides:
   - a configured-Agent picker from `/v1/agent-chat/agents`;
   - explicit conversation creation and pinned Agent/model/configuration identity display;
   - user and assistant messages with `pending`, `succeeded`, `failed`, and `cancelled` states;
   - a fixed composer, visible send state, bounded error display, and incremental polling until a pending reply reaches a terminal state;
   - a clear note that Magpie/provider model and credential configuration live in Magpie, not Pagurus.
4. The workspace never writes organization routes, reads private Runtime files or databases, renders SecretHandle plaintext, invents local task outcomes, or presents an optimistic local message as Runtime-published state.
5. Unsupported Runtime, missing Agents, stale conversation, model/task failure, and idempotent replay errors are visible bounded states. The organization primary-conversation panel remains unchanged.
6. Validation includes typed-client fixtures, workspace gating, Agent selection, conversation creation, message submit, polling, pending/terminal states, keyboard focus, reduced motion, and narrow layouts. Both repositories must pass `npm run check`, `npm test`, and `npm run build`.

## Options

### A. Reuse the organization conversation panel

Consequences: blurs Boss orchestration with direct Agent chat and changes ADR 0022's projection-only semantics. Rejected.

### B. Let Pagurus call the model provider directly

Consequences: bypasses Conchbase Runtime authority, Agent revisions, pinned configuration, and secret boundaries. Rejected.

### C. Add a separate typed Agent Chat workspace over the Runtime-published 1.5.0 contract

Consequences: preserves Runtime ownership and gives users a normal configurable-Agent conversation. Accepted.

## Consequences

Pagurus can now test configured Agents directly while Boss mode remains an organization orchestration surface. Magpie remains a user-configured OpenAI-compatible protocol endpoint.

> Paired client contract: this ADR covers only Conchbase ADR 0046's Agent Chat module.
