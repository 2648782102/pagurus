# Pagurus development workflow

## Before editing

```sh
git status --short
node --version
npm --version
```

Use Node.js 24 or newer. Start Conchbase first, then run `npm run dev` in this
repository. The Vite server proxies `/v1` to the local Runtime. Use a fake
provider for automated and paired tests.

## Change loop

1. Pick one task from [`PROJECT_PLAN.md`](PROJECT_PLAN.md).
2. Read the matching Runtime contract and current API client.
3. Inspect the owning feature, tests, and styles before editing.
4. Write a failing validator/component test for changed behavior.
5. Implement the smallest feature-local slice.
6. Check loading, error, offline, unsupported, keyboard, and narrow layouts.
7. Run the focused test, then check, test, and build.
8. Update `CURRENT_STATE.md` only when the user-visible product changes.

## Boundaries

- `src/shared/api/` validates Runtime responses and owns HTTP transport calls.
- `src/features/` owns feature state and presentation.
- `src/app/` composes the operator shell; `src/agent/` composes the personal
  Agent surface.
- `src/shared/ui/` contains genuinely reused, Runtime-independent primitives.
- Styles belong in the relevant `src/styles/` layer.
- Components receive narrow typed props; do not pass an entire controller when
  a smaller view model is enough.
- Never read `.conchbase`, SQLite, private Runtime files, or environment
  credentials from browser code.

## Runtime contract changes

If the UI needs a new Runtime operation, first add the Runtime contract,
validator, behavior, and paired test in Conchbase. Then add the Pagurus API
client, capability gate, component states, and tests. Do not invent a route or
duplicate a schema locally.

## Reporting

Report the user-visible result, changed files, focused/full checks, skipped
environment checks, accessibility/security notes, and the next task.
