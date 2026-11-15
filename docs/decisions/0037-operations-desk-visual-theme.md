# Decision 0037: Operations desk visual theme

Status: **accepted client presentation boundary; no Runtime API or contract changes**

Date: 2026-11-16 (Asia/Shanghai).

## Context

The console inherited a warm cream canvas, a green accent, all-caps monospace
kickers, widely rounded cards and a soft shadow on every surface. That
combination is a generic generated-UI default rather than a choice made for this
product. It also flattened hierarchy: a page that should feel like a local
control desk read as a collection of identical cards.

Pagurus is a machine-side operations console for one local Runtime. Its subject
is berths, log sheets and instrument panels: persistent navigation, ruled
surfaces, compact data, and a small number of signals that mean something.

## Decision

1. **One visual metaphor: a port operations desk.** Deep ink navigation is the
   fixed berth rail. The content canvas is cool, low-chroma paper. Status and
   actions are the only saturated colour.
2. **Named palette.** `canvas #e9edee`, `paper #f7f8f7`, `ink #172124`,
   `navy #17272c`, `steel #366b7a`, `rust #b4542f`. Rust is reserved for primary
   operator action and active selection; steel carries identity and links;
   signal green, amber and danger red are status-only and always have text.
3. **Square surfaces and rules.** `--radius-*` collapses to 0–2px and
   `--shadow-card` is `none`. Panels are separated by hairline rules, not
   floating cards or elevation.
4. **Type has roles.** `Avenir Next` and system sans for interface copy;
   `SFMono-Regular` for IDs, counts, endpoints and state labels. Kickers are
   sentence-case Chinese roles, not decorative all-caps English.
5. **One masthead per workspace.** The page header is a masthead with a
   sentence-case title and a compact runtime boundary slip. It is not a hero
   card and does not repeat the workspace purpose verbatim.
6. **Density follows information.** Dense evidence uses ruled rows and compact
   monospace data. Empty states stay compact and explain the next action. Raw
   density does not mean tiny everything: body copy remains at least 11–12px.
7. **No new dependency or component framework.** The theme is expressed through
   the existing token, primitive and feature stylesheet layers. No Runtime API,
   client schema, contract or security boundary changes.

## Options

### A. Keep the cream/green card kit and only retune colours

Consequences: one generated default becomes another; the card hierarchy and
decorative kickers remain. Rejected.

### B. Adopt a full design-system dependency

Consequences: a new dependency and a second styling authority for a small
control console. It would not solve the subject-specific hierarchy. Rejected.

### C. A subject-specific operations-desk theme in the existing layers

Consequences: distinctive, legible density, no new dependency, and every
surface keeps its existing behaviour. Accepted.

## Validation

- `tests/interface-validation.test.tsx` continues to verify visible focus,
  reduced motion, and the rail/content responsive boundaries.
- `tests/ui-primitives.test.tsx` covers button, field, status, disclosure,
  empty and notice semantics under the new skin.
- `tests/workspace-navigation.test.tsx` covers primary workspace navigation and
  page-heading visibility.
- `npm run check`, `npm test`, and `npm run build` pass.

## Consequences

New surfaces compose the token and primitive layers instead of inventing local
card styles. A future dark or high-contrast variant should change tokens, not
feature markup. The console now has a visual point of view tied to its actual
job, rather than a generic AI-generated palette.
