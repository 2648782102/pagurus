# Decision 0013: Console workspace navigation

Status: **accepted workspace shell; no client or Runtime API contract changes**

Date: 2026-11-12 (Asia/Shanghai).

## Context

Pagurus `1.0.0` already exposes Agent management, task operations, task history, durable-work control, capability records, write-only SecretHandles, and versioned Runtime configuration. The previous shell rendered every feature as one long scrolling landing page. Navigation used unlabeled icon links and an additional workspace list, which made the console feel like a single static document and obscured the distinction between a connected control surface and marketing-style hero content.

The Runtime contract remains Conchbase's exact 47-path OpenAPI. Pagurus must not add a second schema, read private state, call a new write route, persist console preferences, or present placeholder navigation as implemented work. A navigation shell can improve focus, status, and information density without changing any of those boundaries.

## Decision

1. `src/app/useWorkspace.ts` owns one hash-based workspace resolver and seven explicit workspaces: overview, Agent configuration, tasks, durable work, capability records, sensitive handles, and Runtime settings. It introduces no routing dependency and no browser storage.
2. `src/app/App.tsx` renders a persistent, labeled sidebar, a console topbar, one page heading, and only the active workspace's feature panels. Legacy feature anchors resolve to their owning workspace so existing links and bookmarks remain meaningful.
3. The overview keeps the existing `RuntimeStatusPanel` plus quick links to every implemented surface. Connection, loading, disconnected, incompatible, capability-disabled, and empty states remain owned by the existing feature-local hooks and Runtime capability gates.
4. Each workspace link exposes an exact accessible label, `aria-current="page"` on the active item, visible focus, and a skip link to the main content. Focus moves to the page container after navigation; reduced-motion and narrow layouts remain respected.
5. No Runtime route, typed client, request body, response validator, SecretHandle one-shot flow, capability gate, API version guard, or product state owner changes. Conchbase remains the execution authority.
6. This is a shell and presentation-architecture change, not a new release. The frozen `1.0.0` public contract, Chinese release notes, and Release assets remain unchanged.

## Consequences

- A user can now choose one bounded console surface at a time instead of scrolling past every feature.
- Unmounting inactive panels avoids simultaneous background reads from unrelated features. Navigating back reloads authoritative state through the existing hooks.
- Hash state is ephemeral UI state. It is not a Runtime preference, workspace profile, authorization decision, or durable client state.
- The overview remains human-facing orientation only; feature panels and published Runtime responses remain the source of truth.

## Validation

- `tests/app-placeholders.test.tsx` verifies implemented links and the absence of placeholder navigation.
- `tests/workspace-navigation.test.tsx` verifies legacy aliases, single-workspace rendering, hash transitions, active navigation state, and keyboard-visible navigation.
- `npm run check`, `npm test`, and `npm run build` must pass. CI runs all three commands.
- A real local preview must show active navigation and the selected workspace against the running Conchbase and Vite proxy.

## Boundaries

- Add no dependency, private-runtime import, browser storage, generic secret resolver, credential, user data, or machine-specific path.
- Do not add tool approval UI, executable capability lifecycle, visual composition editing, remote pairing, SSE, or server-side pagination.
- Keep all existing write routes and response validation at `src/shared/api/`.
- Keep every final surface gated on its published Runtime capability.
