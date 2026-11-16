# Decision 0043: A context panel for facts the transcript cannot hold

Status: **accepted client architecture for the shipped Agent surface; no Runtime
API, route, or client-schema changes**

Date: 2026-11-17 (Asia/Shanghai).

## Context

The product was a single reading column with history behind a drawer. That is
right for reading, but three things the Runtime already publishes had nowhere
to live:

- the three revisions a conversation pins (Agent, runtime configuration,
  conversation id), which previously only appeared if the reader opened a
  popover on the model pill;
- the Agent revision's granted tools and skills, which is the honest answer to
  "what can this thing actually do";
- message `activity` (turn / tool / approval / output), which the client
  received and never rendered.

The user's request was "the right side should have a function panel that can be
extended later". The design question was therefore not where to put a column,
but what belongs in it.

## Decision

1. **The panel holds published facts, never edits.** Three sections: pinned
   revisions, capability boundary, execution activity. No control in the panel
   mutates Agent state, grants a capability, or resolves a secret; a note at the
   foot says so and points at the console.
2. **It opens on demand and takes space.** Above 900px the panel becomes a
   second grid column, so the reading column re-centres in the space it actually
   has instead of being covered. Below 900px it overlays and the page behind
   dims and stops accepting pointer events, because two text columns on top of
   each other are unreadable.
3. **Capability reads are honest about built-in Agents.** The Boss Agent is a
   Runtime-owned adapter with no `/v1/agents/{id}` record. Asking for one
   returned 404 and rendered as "读取失败", which is wrong: nothing failed. The
   loader now recognises that case and the panel states what the adapter can do
   instead of inventing an Agent revision.
4. **Activity is flattened, not invented.** The panel lists every published
   `activity` entry in message order, de-duplicated by id. It does not infer
   steps, retries, or timing the Runtime did not publish.
5. **Ids stay distinguishable.** Truncating to the tail produced labels like
   `…_runtime-v1` that identified nothing. The panel keeps the first 8 and last
   6 characters and exposes the full value in a `title`.
6. **The toggle is a disclosure, not a toggle button.** `aria-expanded` plus
   `aria-controls` describe a region the control owns; `aria-pressed` made
   assistive technology announce it as a checkbox. The panel stays mounted and
   `hidden` so the reference is always valid.

## Options

### A. A permanently visible right rail

Consequences: the reading column loses width on every visit for information
consulted occasionally. Rejected.

### B. Put everything in the model popover

Consequences: one menu accumulating unrelated facts, and activity has no
natural home there. Rejected.

### C. An on-demand panel, read-only, that extends by section

Consequences: one more layout branch to maintain, but each future capability
gets an obvious place and the reading column is unaffected when the panel is
closed. Accepted.

## Validation

- `npm run check`, `npm test` (241 passing), and `npm run build`.
- `tests/agent-app.test.tsx` covers opening the panel, reading pinned revisions,
  loading capability grants on demand, and collapsing it with the correct
  disclosure state.
- `tests/architecture.test.ts` still enforces the per-layer style ceiling;
  `agent-context.css` is its own layer.
- Verified live at 1280px (side column, reading column re-centres) and 420px
  (overlay, background dimmed), including the built-in Boss Agent case.

## Consequences

A new "extensible" capability now means a new section component inside
`AgentContextPanel`, backed by a published Runtime field. Anything that would
edit Agent state, install a capability, or resolve a secret belongs in the
console, or needs a new Runtime contract and an ADR first.
