# Decision 0030: Agent Chat live stream console

Status: **accepted and implemented Agent Chat live stream console**

Date: 2026-11-15 (Asia/Shanghai).

## Context

Conchbase ADR 0060 upgrades the Agent Chat contract to `1.8.0` and adds a read-only Server-Sent Events projection. Before this, Pagurus refreshed the conversation every 700 ms and could not show tool activity or streamed text promptly. The console already renders the `1.7.0` activity projection and inline approval; what it lacks is a push transport and a reconnect story.

## Decision

1. The typed client targets `agentChatContract: 1.8.0` and six published Agent Chat paths, including `GET /v1/agent-chat/conversations/{conversationId}/events`.
2. `openAgentChatStream` wraps `EventSource` for the projected stream, validates every frame strictly, and exposes only `close`. It never parses or renders tool arguments, file contents, or provider reasoning.
3. The conversation panel opens the stream while an assistant turn is pending. A `snapshot` frame replaces the conversation; a `message` frame upserts the assistant message by id. Polling stays as the fallback when `EventSource` is unavailable or already-connected streaming has not produced a frame.
4. The client never treats the stream as authority: approval still calls `POST .../approval`, and the client does not invent message state or a local transcript.
5. No other published contract changes. SSE retention, multi-process fan-out, compression, tool-argument display, and provider reasoning display remain outside the boundary.

## Validation

- `tests/agent-chat-stream-client.test.ts` covers the `1.8.0` gate, six paths, cursor URL construction, snapshot parsing, malformed-frame rejection, and close behavior.
- `tests/agent-chat-panel.test.tsx` covers activity rendering and inline approval.
- `npm run check`, `npm test`, and `npm run build` pass.

## Consequences

The console can show tool activity, streamed replies, and approval requests promptly while preserving Runtime authority and a working polling fallback.
