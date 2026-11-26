# Vendored DSH client

DSH (`github.com/deepseek-ai/deepseek-harness`, MIT) is vendored here rather
than consumed as a dependency, because Pagurus rewrites its presentation
components for a different product.

## What is here

- `packages-client/` — the complete `packages/client` tree from DSH
  `0.2.3-alpha.2`: 84 Cordis plugin packages, 1169 files under `src/`. It is
  kept whole so the reference implementation, its tests, and its locale files
  stay readable next to our adaptation. **Nothing in `packages-client/` is
  imported by the Pagurus build**; it is a reference tree.
- `theme/` — DSH's real design tokens: `design-platform.css` (the `--dsw-*`
  scale and its light/dark alias maps), `base.css`, `scrollbar.css`,
  `corner-shape.css`, `focus.css`. These are CSS custom properties only, with
  no Cordis dependency, so they are used as-is.
- `primitives/` — DSH's `ui-primitives` atoms that Pagurus actually renders:
  `DisclosureRow`, `StateDot`, `TextShimmer`, `Marquee`, and the product icon
  set. DSH describes this package as "Cordis-free React atoms"; the only change
  made while vendoring is React 19 typing for `inert` in `TextShimmer`.

## Why this split

DSH's own `packages/client/AGENTS.md` says its presentation layer is
"consumables, expected to be rewritten wholesale": business data lives in its
object layer, and components receive everything through derived props. Pagurus
has a different object layer (the Conchbase Runtime contract), so the correct
adaptation is to keep DSH's tokens and atoms and rewrite the compositions
against our data — which is what `src/agent` and `src/features` do.

## Updating

Re-copy from a DSH checkout at the version recorded above, then re-run
`npm run check`. Divergences from upstream must be listed here.

| File | Change |
| --- | --- |
| `primitives/TextShimmer.tsx` | `inert=""` → boolean `inert` for React 19 |
