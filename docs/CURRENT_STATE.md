# Current state

Updated: 2026-11-27

## Working today

- `/` opens the Agent surface; the operator console is reached with
  `?surface=console` or any existing `#workspace` bookmark.
- React 19 + TypeScript + Vite application, built on the DSH client design
  system: DSH's `packages/client` is vendored whole under `vendor/dsh`
  (reference tree, MIT) and the compiled subset — its `--dsw-*` token sheets,
  its Cordis-free `ui-primitives` atoms, and its `@file`/trigger detection core
  — lives under `src/dsh`. See `src/dsh/README.md` for the split and the one
  divergence from upstream.
- The theme has one source of truth: `src/styles/dsh-bridge.css` maps the
  product's `--ag-*` names onto DSH aliases and is the only place that declares
  the dark mapping. A theme flip writes both `data-agent-theme` (ours) and
  `data-ds-dark-theme` (DSH's), so vendored components and product styles
  change in the same frame.
- Same-origin development proxy to Conchbase loopback API.
- Operator console with runtime status, Agent management, tasks, history,
  configuration, organization, execution, work, capabilities, and SecretHandle
  surfaces.
- Agent surface with conversation history, model selection, streaming, copy,
  context panel, responsive layout, and inline approval state.
- DSH-style workbench chrome: a persistent session rail (searchable once there
  are more than six threads), one conversation column, a Boss work rail, and a
  context column at 1920×1080. The top bar carries only 菜单 and 新对话; theme,
  context, history, and diagnostics live in the settings drawer.
- A settled turn's tool work folds into one disclosure line ("N 个步骤 · M 个
  失败") and opens into rows with a state dot, tool name, state, and detail.
  A running or blocked turn stays open, so a pending approval is never hidden.
  The row is DSH's own `DisclosureRow` with its `StateDot` and `TextShimmer`.
- The workbench's two side tracks are solved by DSH's `computeColumns`: the
  right panel shrinks, then loses its track, before the centre falls below its
  400px minimum, and the left rail never concedes. The numbers arrive as CSS
  custom properties; the stylesheet owns the geometry.
- The composer offers two triggers: `/` for client commands (new thread,
  history, context, diagnostics, settings) and `@` for workspace file
  references, backed by the Runtime's bounded `workspace-index`. Both are
  keyboard-driven; the textarea keeps focus and the popup is a listbox with
  `aria-activedescendant`.
- The Boss Agent conversation shows an inline work strip: project state, worker
  state, reports, failures, and open Attention come from the Runtime's
  organization session, without adding a second conversation entry or parsing
  model prose.
- The Boss Agent surface uses a three-region desktop layout: a semantic work
  rail, the conversation, and a context drawer that overlays below 1280px and
  becomes a real column at 1280px+. Work states use CSS motion paired with
  readable labels and respect reduced motion.
- The operator console has been folded into the Agent surface as the “菜单”
  settings drawer: Agent and tool grants, model catalog, and runtime facts.
  Debug-only console workspaces are no longer reachable from the shipped app;
  old `?surface=console` links land on the Agent.
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
