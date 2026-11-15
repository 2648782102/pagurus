# Decision 0033: Agent Chat lands on an Agent panel, not the last conversation

Status: **accepted and implemented Agent Chat landing panel**

Date: 2026-11-15 (Asia/Shanghai).

## Context

`useAgentChat.loadAgents` used to fetch the conversation history and immediately open `conversations[0]`. Opening the Agent Chat tab therefore dropped the user into whatever they said last, with no way to see which Agent they were talking to or that other conversations existed. Changing Agent meant leaving the conversation first.

That is the wrong default for a product whose central object is the Agent. The first question a user has when opening this surface is "who do I want to talk to", not "continue the last thread".

## Decision

1. The Agent Chat tab always lands on an Agent panel. No conversation is opened implicitly; history is fetched but not entered.
2. The panel presents three things together, so the user makes one decision instead of three:
   - **Agent picker**: every non-archived Agent as a selectable card, showing the default marker, the Boss marker, and how many conversations that Agent has.
   - **New conversation**: model and reasoning-strength selection plus one primary action.
   - **History**: conversations filtered to the selected Agent, each with its preview, time, message count, reasoning effort, and a `继续对话` action.
3. Selecting an Agent scopes the history list. It does not start or resume anything; those remain explicit actions.
4. `startConversation` and `resumeConversation` are separate code paths, both explicit. The previously implicit "restore latest" behaviour is removed from the load path.
5. The panel does not offer archived Agents for new conversations, but their history is never fabricated or hidden beyond that.
6. No Runtime route or schema changes. This is a console-only decision over the existing `agents` and `conversations` contracts.

## Options

### A. Keep auto-resuming the latest conversation

Consequences: the user cannot tell which Agent they are in, cannot see other history, and must leave the conversation to switch Agent. Rejected.

### B. Land on a bare Agent dropdown, history elsewhere

Consequences: splits one decision across two surfaces, and hides that history exists per Agent. Rejected.

### C. One panel with picker, launcher, and scoped history

Consequences: the Agent is the unit of the surface, and continue-versus-new is an explicit choice. Accepted.

## Validation

- `tests/agent-chat-landing.test.tsx` asserts the panel lands without opening a conversation, each Agent card shows its own conversation count, selecting an Agent scopes history, `继续对话` resumes the chosen conversation, and `开启新对话` creates a new one from the same panel.
- `tests/agent-chat-panel.test.tsx` and `tests/agent-chat-stream-stall.test.tsx` were updated to enter history explicitly rather than relying on implicit restoration.
- `npm run check`, `npm test` (133), and `npm run build` pass.

## Consequences

Opening Agent Chat now answers "who am I talking to" first and "continue or start over" second. The cost is one extra click to resume the most recent conversation; the benefit is that a user never lands in a conversation they did not choose, and never has to leave one to change Agent.
