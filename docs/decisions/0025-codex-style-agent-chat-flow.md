# Decision 0025: Codex-style Agent Chat flow

Status: **accepted paired client UX boundary; no Runtime API contract changes**

Date: 2026-11-14 (Asia/Shanghai).

## Context

ADR 0023 adds the `1.5.0` Agent Chat workspace and ADR 0024 makes the Runtime-owned 老板 Agent the preferred entry. The first implementation still reads like a test harness: Agent picker, visible revision/configuration/conversation ids, a message list, a refresh button, and a separate start button remain on screen throughout the conversation. Users expect a Codex-like flow: configure once, open a conversation, then send one message after another in a focused thread.

The Runtime API already exposes conversation creation, conversation reads, and message submission. No new route, schema, or client contract is required. This is a client interaction and information-hierarchy change.

## Decision

1. Pagurus keeps the frozen Conchbase `1.5.0` API. Agent Chat state remains Runtime-published; no browser storage, no local transcript persistence, and no optimistic published-message fabrication.
2. Before a conversation starts, the workspace shows a compact setup card: choose an Agent, choose the default 老板 Agent when available, and start the conversation. Technical ids are not shown in this state.
3. After the conversation starts, the setup card collapses out of the main flow. The primary surface is a continuous message thread with a persistent bottom composer.
4. The active conversation header shows only a short Chinese status: selected Agent name, model/provider when meaningful, and a `更换 Agent` action. Revision ids, configuration revision ids, and conversation ids move behind an optional `会话信息` disclosure.
5. Messages are rendered as a chronological conversation. User messages align right, assistant messages left, pending replies show a visible `正在回复…` state, and failed/cancelled replies show bounded text plus error. Raw state labels such as `published` / `succeeded` are not shown for normal messages.
6. The composer supports Enter to send and Shift+Enter for newline. It keeps focus after send, clears only after Runtime accepts the message, and shows a compact sending/responding indicator. The explicit `刷新回复` control is removed from normal chat; polling remains automatic while a Runtime-published assistant message is pending.
7. The thread auto-scrolls to the newest Runtime-published message only when the user is already near the bottom. Opening the workspace on a fresh conversation focuses the composer.
8. Configured Agent and Boss Agent behavior remains unchanged from ADRs 0023 and 0024. Boss Agent still submits intents to Runtime; normal Agents still use Agent-backed tasks and the user-configured Magpie OpenAI-compatible protocol endpoint.
9. Unsupported Runtime, empty Agent list, load/submit/poll error, pending reply, failed reply, and disabled composer states remain explicit and accessible. Keyboard focus, visible focus, reduced motion, and narrow layouts remain required.
10. Streaming assistant deltas, cross-device conversation persistence, multi-conversation sidebars, attachments, and model-native transcripts remain blocked and require separate accepted ADRs.

## Options

### A. Keep the panel as a state inspector with a chat log

Consequences: clear for debugging but not a normal conversation product. Rejected.

### B. Add a local chat store and optimistic assistant messages

Consequences: creates a second source of truth, complicates replay, and risks presenting local state as Runtime-published. Rejected.

### C. Reshape the existing Runtime-published conversation into a focused setup-to-chat flow

Consequences: closes the product gap without changing the Runtime contract or authority boundary. Accepted.

## Validation

- `tests/agent-chat-panel.test.tsx` covers setup-to-chat transition, hidden setup after start, continuous message rendering, Enter/Shift+Enter composer behavior, pending reply text, optional session details, failure text, and unsupported Runtime fallback.
- `tests/interface-validation.test.tsx` and repository guardrails continue to cover keyboard navigation and source boundaries.
- `npm run check`, `npm test`, and `npm run build` pass.

## Consequences

Agent Chat now reads as a normal conversational workspace: configure once, then talk sentence by sentence. Runtime remains the only execution and publication authority.

> Client UX boundary: no Conchbase OpenAPI path, schema, or response field changes.
