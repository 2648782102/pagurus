# DSH client source (vendored reference tree)

The complete `packages/client` tree of
[`deepseek-ai/deepseek-harness`](https://github.com/deepseek-ai/deepseek-harness),
MIT licensed. Vendored at `0.2.3-alpha.2` (`4b399c3`).

`packages-client/` holds all 84 client packages with their `src/`, `tests/`,
and locale files: 3689 files. **It is a reference tree — the Pagurus build does
not import from it.** It is here so the DSH implementation we adapt is readable
next to our adaptation, and so a future update is a re-copy plus a re-read
rather than an archaeology exercise.

## What we actually use

`src/dsh/` holds the subset that is compiled into Pagurus:

| Path | Source | Used for |
| --- | --- | --- |
| `theme/` | `ui-theme/src/styles` | DSH's `--dsw-*` token scale, light and dark |
| `primitives/` | `ui-primitives/src` | `DisclosureRow`, `StateDot`, `TextShimmer`, `Marquee`, `Button`, `Pill`, `Tag`, `SearchField`, `ConnectionIndicator`, product icons |
| `trigger/` | `ui-input-trigger/src/core/detect.ts` + `dsh-file-reference/src/grammar.ts` | `/` and `@` detection with URL/email carve-outs and quoted paths |

`src/dsh/README.md` records the divergences from upstream (currently one React
19 typing change).

## Why not import `packages-client/` directly

Those packages are Cordis plugins: they expect a Cordis container, a DSH
session object layer, and a slot renderer. Pagurus has the Conchbase Runtime
contract instead. DSH's own `packages/client/AGENTS.md` states that its
presentation components are "consumables, expected to be rewritten wholesale",
so the intended reuse is exactly what we do: take the tokens, the atoms, and
the pure cores, and compose them against our own data.

## License

DSH is MIT. `LICENSE` here is the upstream license; each vendored file keeps its
original header. The bundle also carries `Montserrat-OFL.txt` alongside the
brand font when it is used.
