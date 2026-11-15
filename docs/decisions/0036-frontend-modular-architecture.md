# Decision 0036: Modular front-end architecture

Status: **accepted client architecture boundary; no Runtime API or client-schema changes**

Date: 2026-11-16 (Asia/Shanghai).

## Context

The console grew feature by feature. `App.tsx` owned routing, shell markup, overview
content, and workspace dispatch; `AgentWorkspace.tsx` owned selection, editing,
history, and comparison; the organization console owned every audit card; and
`styles.css` had become the largest file in the repository. The behavior was
correct, but the units were too large to review or change safely in one pass, and
unrelated concerns were coupled through markup rather than interfaces.

## Decision

1. **Four layers, one direction.**
   - `src/app/`: shell composition, workspace registry, and page chrome.
   - `src/features/<domain>/`: a domain's UI, its local state, and its pure helpers.
   - `src/shared/ui/`: dependency-free presentation primitives.
   - `src/shared/api/`: typed transport clients for the published Runtime contract.
   Dependencies point downward: app → features → shared. Shared modules never
   import features, and presentation modules do not perform transport calls.
2. **Small modules by default.** TypeScript/TSX modules stay under 500 lines.
   `tests/architecture.test.ts` enforces this and the dependency direction.
   Large contracts are allowed to be split by domain rather than hidden behind a
   barrel file.
3. **Container / component separation.** A workspace is a container: it chooses
   state and composes components. Editors, pickers, histories, cards, and
   comparisons are components that receive typed props. They must not accept
   `ReturnType<typeof use...>` as a shortcut: a leaf component should list the
   fields and actions it actually renders so a controller change cannot widen
   the component contract. Transport state stays in the feature hook that owns it.
4. **Live transport is its own module.** `useAgentChatStream` owns SSE, the
   pending-message poll, stalled detection, visibility refresh, and frame merging.
   `useAgentChat` composes it with catalog, selection, send, and approval actions.
5. **Styles are layered but keep one entry point.** `styles.css` remains the only
   import from `main.tsx`; it imports `styles/tokens.css` and
   `styles/primitives.css`. Component selectors continue to live in the main
   stylesheet so class ownership stays obvious while the shared layer can evolve
   independently.
6. **No new framework or state dependency.** The split uses React and the existing
   typed clients. A component library or data-fetching framework remains a
   separate decision.
7. **One presentation vocabulary per contract.** Repeated UI labels for the same
   published enum live in one shared presentation module rather than in each
   panel. This is not a global label dictionary: domain-specific execution and
   organization terms stay with their feature.
8. **Polling is cancellable and visibility-aware.** Incremental refresh uses one
   shared timer boundary: it aborts the previous in-flight request, aborts on
   unmount, and skips hidden tabs. A feature keeps its own loading and merge
   semantics.
9. **One write path per surface.** A panel calls its controller for mutations;
   it does not import a transport client to perform a second write. This keeps
   busy, error, capability gating, and refresh behavior consistent.

## Options

### A. Keep monoliths and add a style guide

Consequences: the documentation improves, but the coupling and review cost stay.
Rejected.

### B. Introduce a router and a state framework to force boundaries

Consequences: a large new dependency surface and a second source of truth for
navigation and server state. It would not fix the actual file boundaries.
Rejected.

### C. Split by domain, enforce direction, and keep the existing runtime

Consequences: smaller units, explicit interfaces, no contract or dependency
change. Accepted.

## Validation

- `tests/architecture.test.ts` checks the 500-line ceiling and the import
  direction.
- Existing workspace, Agent, organization, Agent Chat, and interface fixtures
  continue to pass unchanged.
- `npm run check`, `npm test` (145), and `npm run build` pass.

## Consequences

Adding a feature should start with a domain folder and a container/component
split. Cross-feature reuse belongs in `shared`, but only when the behavior is
genuinely generic. The architecture test now makes regressions visible in CI.
