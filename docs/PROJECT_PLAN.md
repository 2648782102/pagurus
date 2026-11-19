# Pagurus product plan

Pagurus follows the shared Conchbase plan. The Runtime is the authority; this
file describes the UI work needed to make the personal Agent pleasant and
understandable.

## Main user journey

1. Open Pagurus and see whether Conchbase is ready.
2. If not ready, see one actionable setup screen.
3. Choose a default Agent and model, or accept sensible defaults.
4. Send the first message from the Agent surface.
5. See response progress and tool activity without technical noise.
6. Approve a consequential action with a clear explanation.
7. Read the answer, evidence, files changed, and next steps.
8. Find the conversation again after restart.

## UI phases

### UI0 — Development and contract reliability

- `UI0.1` Add a paired local setup document with exact Runtime/console startup,
  ports, fake provider, and troubleshooting commands.
- `UI0.2` Add a single reusable Runtime connection/doctor state and use it in
  overview, Agent, and setup surfaces.
- `UI0.3` Add contract fixture helpers so malformed responses and unsupported
  capabilities are tested consistently.
- `UI0.4` Keep the focused test and build commands visible to coding models.

### UI1 — First-run personal assistant flow

- `UI1.1` Make the Agent surface the default entry for a new user.
- `UI1.2` Build a first-run setup flow: Runtime, provider, workspace, Agent,
  model, and first message.
- `UI1.3` Preserve the setup choice without browser secrets or a competing
  Runtime state model; use a small local preference only if truly necessary.
- `UI1.4` Provide friendly offline, unsupported, provider-unavailable, and
  retry states with exact next actions.
- `UI1.5` Add a quick path back to advanced operator controls.

### UI2 — Unified conversation and activity

- `UI2.1` Define one presentation vocabulary for user message, assistant
  answer, thinking, tool activity, approval, report, attention, failure, and
  cancellation.
- `UI2.2` Merge Agent Chat and primary Boss conversation presentation where the
  user does not need to know the implementation distinction.
- `UI2.3` Add an activity timeline that can show bounded tool evidence, changed
  files, approvals, errors, and Runtime notices.
- `UI2.4` Keep advanced raw IDs, revisions, and provider details behind a
  disclosure or diagnostics view.
- `UI2.5` Add reconnect/resume affordances around SSE and polling fallback.

### UI3 — Safe action review

- `UI3.1` Design the approval card around intent, target, risk, preview, and
  exact buttons rather than raw JSON.
- `UI3.2` Show a diff or preview for workspace writes before approval.
- `UI3.3` Make stale, expired, denied, failed, and already-completed decisions
  distinct.
- `UI3.4` Add an action history view linked to the conversation and task.

### UI4 — Memory and project understanding

- `UI4.1` Add a readable memory review surface with scope, provenance, and
  retract/delete actions once the Runtime memory contract is stable.
- `UI4.2` Show project status, current attention, workers, reports, and close-out
  in one user-oriented view.
- `UI4.3` Let users find conversations and completed projects without exposing
  internal Runtime tables or implementation terminology.

### UI5 — Everyday operations

- `UI5.1` Add support diagnostics that redact secrets, prompts, private file
  contents, and model transcripts unless explicitly selected by the user.
- `UI5.2` Add backup/restore guidance and visible Runtime data location.
- `UI5.3` Validate keyboard-only workflows, narrow layouts, reduced motion,
  screen-reader labels, and long streaming sessions in a real browser.
- `UI5.4` Choose one packaging path and keep Pagurus a Runtime client inside it.

## UI non-goals for now

- Do not reproduce the Runtime database in React state.
- Do not build a visual multi-Agent topology editor before the single Agent
  conversation is excellent.
- Do not expose raw tool execution just because an internal capability exists.
- Do not store provider credentials in the browser.
- Do not add a state-management framework until measured shared state requires
  it.

## Definition of done

A UI task is complete when the user-visible path works against a real local
Runtime or deterministic fixture, every relevant async state is intentional,
keyboard and narrow-layout behavior is tested, no secret crosses the browser
boundary, and the Runtime remains the source of truth.

## Current next task

Start with `UI0.1`, then `UI0.2`, then `UI1.1`. Coordinate Runtime work through
the matching Conchbase task IDs before adding client behavior that requires a
new route.
