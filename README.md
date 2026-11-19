# Pagurus

Pagurus is the local web console for the [Conchbase](https://github.com/2648782102/conchbase)
personal Agent runtime. It helps a user start conversations, inspect progress,
approve actions, manage Agents, and recover local work. Conchbase remains the
authority for execution, permissions, secrets, and durable state.

## Quick start

Requirements: Node.js 24 or newer. Start Conchbase first, then:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`. Vite proxies `/v1` to Conchbase at
`http://127.0.0.1:4318`. Real model calls require a configured local provider;
tests use deterministic Runtime fixtures.

## Read next

- [`docs/START_HERE.md`](docs/START_HERE.md) — short coding-model entry point.
- [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — current screens and gaps.
- [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) — UI tasks and user journey.
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — implementation workflow.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — client boundaries.
- [`docs/VALIDATION_PLAN.md`](docs/VALIDATION_PLAN.md) — UI checks.

The `docs/` directory intentionally contains only current product and
engineering documentation. The code and tests are the source of implementation
history.

## Checks

```sh
npm run check
npm test
npm run build
```

Pagurus never reads Conchbase private files, stores provider credentials in the
browser, or implements a second Runtime state model.

MIT licensed. See [`LICENSE`](LICENSE).
