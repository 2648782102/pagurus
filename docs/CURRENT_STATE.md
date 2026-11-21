# Current state

Updated: 2026-11-21

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
- The Agent surface reports stream degradation while a reply is pending: a
  stalled stream or an in-progress reconnect says so and notes that polling is
  carrying the update. A healthy stream shows nothing.
- Typed API modules with response validators and capability-based feature
  gating.
- No browser storage for Runtime secrets or private state.
- One icon family (Lucide) with even optical weight, one focus ring and press
  response on every product control, and skeleton rows for a panel's first
  read. Motion is not load-bearing: reduced motion removes the sweep and the
  press scale, and nothing conveys state through movement alone.
- One motion library in `src/styles/motion-tokens.css`: three named durations
  chosen by what the movement says (`quick`, `settle`, `travel`) plus one slow
  looping cue, two decelerating curves, nine keyframes named for the movement
  rather than the caller, and `anim-*` classes that pair a keyframe with the
  house timing. A component joins by adding a class; it cannot pick its own
  duration. Guards keep every keyframe in that file and every `animation:` name
  resolvable.
- A message rises into place as it arrives and does not replay while its text
  streams; the newest turn scrolls smoothly when added and sets position
  directly while streaming, since a smooth scroll restarted each frame never
  finishes. The theme cross-fades once per switch rather than permanently, so a
  hover keeps its own timing.

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
