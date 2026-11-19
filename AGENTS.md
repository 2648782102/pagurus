# Pagurus coding notes

Pagurus is the optional local UI for the Conchbase personal Agent runtime.
Conchbase owns execution, permissions, Agent revisions, tasks, conversations,
secrets, and durable state. Pagurus presents Runtime truth and sends explicit
user requests; it is not a second runtime.

## Start here

Read `docs/START_HERE.md`, then `docs/CURRENT_STATE.md` and
`docs/PROJECT_PLAN.md`. Read `docs/ARCHITECTURE.md` and the owning API module
only for the feature being changed. Do not search for additional process
documents before starting work.

## Product principles

- Make the first-run path feel like a personal assistant, not an admin panel.
- Keep advanced controls discoverable without making them the default.
- Use only published Conchbase routes and validate every response at the API
  boundary.
- Never read Conchbase private files or database state.
- Never store credentials, SecretHandle values, prompts, or private file data
  in browser storage, URLs, logs, or the frontend bundle.
- Render Runtime states faithfully. Do not invent a local task, permission, or
  execution state.

## UI quality

Every async surface needs loading, connected, disconnected, error, empty,
unsupported, and recovery states where applicable. Keep keyboard access,
visible focus, reduced-motion behavior, readable narrow layouts, and useful
error copy. Prefer small feature-local components over a new global framework.

## Verification

Use Node.js 24 or newer. For UI changes, normally run:

```sh
npm run check
npm test
npm run build
```

For documentation-only changes, run focused checks if dependencies are
installed and report any skipped commands. Never claim a check passed without
running it.
