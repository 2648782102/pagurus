# Decision 0029: Agent Chat tool activity and inline approval console

Status: **accepted and implemented Agent Chat tool activity and approval console**

Date: 2026-11-15 (Asia/Shanghai).

## Context

Conchbase ADR 0059 upgrades the Agent Chat contract to `1.7.0`: assistant messages now carry a bounded `activity` projection, `waiting_approval` is a published conversation state, and one additive route accepts an in-conversation approval decision. The Pagurus console previously only rendered thinking, streaming, organizing, and waiting-for-attention states. A pending write had no visible tool activity and no way to approve it without leaving the conversation.

## Decision

1. The typed client targets `agentChatContract: 1.7.0` and five published Agent Chat paths, including `POST /v1/agent-chat/conversations/{conversationId}/approval`.
2. `AgentChatMessage` gains the required `activity` array and the message-state vocabulary gains `waiting_approval`. The client validates both strictly and rejects malformed Runtime payloads.
3. `AgentChatThread` renders bounded activity entries (turn, tool, approval, output) with their state, and shows inline "批准并继续" / "拒绝" actions for a `waiting_approval` assistant message that has a task id.
4. The decision is sent to the Runtime approval route only. Pagurus never executes a tool, invents approval state, or stores a parallel transcript; it refreshes the conversation after the decision.
5. No other published contract, path set, or product authority changes. SSE and tool-argument display remain outside the boundary.

## Validation

- `tests/agent-chat-panel.test.tsx` renders tool activity and both inline approval actions and asserts the decision payload.
- `tests/agent-chat-api.test.ts` covers the `1.7.0` gate and five paths.
- `tests/published-contract.test.ts` keeps the typed client aligned with the paired OpenAPI.
- `npm run check` and `npm test` pass.

## Consequences

Users can see what the Agent is doing and approve a write without leaving the conversation, while Runtime remains the only approval and execution authority.
