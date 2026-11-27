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
- `upstream/` — DSH's `ui-primitives` **whole**, plus the three small packages
  it imports (`util/code-language`, `util/workspace-path`, `util/file-drag`)
  and the one type it takes from `brand`. This is the entire Cordis-free atom
  layer: controls, icons, tables, JSON inspector, terminal block, and the
  markdown pipeline that renders every answer (GFM + TeX grammar, incremental
  streaming parser, KaTeX, shiki highlighting, sanitised links and images).
  Import paths inside the tree are rewritten from `@deepseek-ai/...` to
  relative paths; that is the only structural change.

  `upstream/store` and `upstream/primitives/settings-form` were removed: that
  store needs `zustand`, which this repository forbids, and the settings form
  was its only consumer here. Nothing Pagurus renders uses either.

### Package layout

| Directory | Upstream package |
| --- | --- |
| `upstream/primitives` | `@deepseek-ai/dsh-client-ui-primitives` |
| `upstream/code-language` | `@deepseek-ai/dsh-util-code-language` |
| `upstream/workspace-path` | `@deepseek-ai/dsh-util-workspace-path` |
| `upstream/file-drag` | `@deepseek-ai/dsh-util-file-drag` |
| `upstream/brand` | the `Branded` helper type from `@deepseek-ai/dsh-brand` |

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
| `upstream/primitives/TextShimmer.tsx` | `inert=""` → boolean `inert` for React 19 |
| `upstream/primitives/use-clipboard-copy.ts` | timer ref typed as `number`, matching the browser's `setTimeout` |
| `upstream/primitives/useMenuSubmenu.ts`, `markdown/useViewportHighlighting.ts` | `RefObject<T>` → `RefObject<T \| null>`; React 19 types `useRef<T>(null)` as nullable |
| `upstream/primitives/image-drag.ts`, `JsonTree.tsx` | `useRef<T>()` → `useRef<T \| undefined>(undefined)`; React 19 requires an initial value |
| `upstream/primitives/index.ts` | `settings-form` exports removed with the package |
