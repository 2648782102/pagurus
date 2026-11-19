# Current state

Updated: 2026-11-19

## Working today

- `/` opens the Agent surface; the operator console is reached with
  `?surface=console` or any existing `#workspace` bookmark.
- React 19 + TypeScript + Vite application.
- Same-origin development proxy to Conchbase loopback API.
- Operator console with runtime status, Agent management, tasks, history,
  configuration, organization, execution, work, capabilities, and SecretHandle
  surfaces.
- Agent surface with conversation history, model selection, streaming, copy,
  context panel, responsive layout, and inline approval state.
- Typed API modules with response validators and capability-based feature
  gating.
- No browser storage for Runtime secrets or private state.

## Product gaps

- A genuinely new install is already usable: the Runtime always exposes a
  built-in Boss Agent, so there is no "create your first Agent" step. When the
  Agent list is empty the surface says so and points at the provider/model
  stage, which is the part that actually blocks a first conversation.
- Provider and workspace setup still live only in the operator console; there
  is no guided first-run path for them.
- Boss conversation, Agent Chat, task operations, and organization views expose
  overlapping concepts that should be unified for a personal user.
- A single cross-surface activity timeline is missing.
- Support/diagnostic export, reconnect guidance, and runtime doctor output can
  be clearer.
- Real-browser accessibility, packaging, upgrade testing, and long-session
  visual QA need broader coverage.

## Source map

- App shells/navigation: `src/app/`, `src/agent/`
- Feature panels: `src/features/<capability>/`
- Runtime transport and validators: `src/shared/api/`
- Shared UI: `src/shared/ui/`
- Styles: `src/styles/`
- UI tests: `tests/`

## Update rule

Keep this file short. Change it when a screen becomes usable, is removed, or a
product gap changes materially. Put detailed release history in release notes.
