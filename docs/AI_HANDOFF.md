# AI development handoff: Pagurus

> **AI-first project:** Pagurus is developed primarily by AI coding agents. Optimize the repository for fast, accurate agent context loading, bounded changes, and deterministic validation; human handoff is not a product requirement. Keep implementation explicit, typed, and easy to inspect. Start with `AGENTS.md`, then follow this handoff.

This document is the starting packet for a coding model that has not seen the design conversation. It separates actual behavior from the intended product.

## Product definition

Pagurus (寄居蟹) is the optional control console for Conchbase. Its eventual job is to let users configure and inspect agents, MCP connections, Skills, policies, and later plugins through a graphical interface. Conchbase is a separate public repository and owns the agent loop, task state, secrets, and permission decisions. CLI and third-party clients remain valid; Pagurus does not become the execution authority.

## Read in this order

1. `AGENTS.md` — mandatory client/security constraints and AI-first development rule.
2. This handoff, then `docs/AI_DEVELOPMENT.md`.
3. [ADR 0002](decisions/0002-phase-one-task-operations.md) — accepted phase-1 task operations client.
4. [ADR 0003](decisions/0003-streaming-output-progress-client.md) — accepted streaming progress client.
5. [ADR 0004](decisions/0004-versioned-configuration-client.md) — accepted Conchbase `0.4.0` v1 configuration revision client.
6. [ADR 0005](decisions/0005-composition-configuration-client.md) — accepted Conchbase `0.5.0` v1/v2 composition configuration client; `0.6.0` keeps the same configuration document union.
7. `docs/ARCHITECTURE.md`, `docs/TECH_STACK.md`, and `src/shared/api/` — client boundary and typed API clients.
8. `docs/ROADMAP.md`, `docs/VALIDATION_PLAN.md`, and [ADR 0001](decisions/0001-ai-development-guardrails.md) — planned work, validation, and executable boundaries.
9. Conchbase's `docs/AI_HANDOFF.md`, `docs/openapi.yaml`, and `docs/AI_TASK_QUEUE.md` — the authoritative cross-repository contract and sequencing.
10. Conchbase [ADR 0011](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0011-phase-one-database-instance-ownership.md), [ADR 0012](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0012-streaming-output-progress.md), [ADR 0014](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0014-versioned-configuration-api.md), [ADR 0015](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0015-composition-identity-kernel.md), [ADR 0016](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0016-composition-execution-and-public-schema.md), and [ADR 0017](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0017-public-tool-request-approval-ledger.md) — accepted runtime boundaries.

## Current repository facts

Implemented:

- React + TypeScript UI built with Vite, with responsive connection status and explicit checking, connected, disconnected, and unsupported-API-version states.
- Read-only `GET /v1/health` and `GET /v1/runtime` calls through the loopback Vite proxy, with response validation at the API boundary.
- Task operations are implemented against Conchbase's published API: model catalog, task creation, task polling, cancellation, and explicit retry. A user picks a model id from the user's Magpie catalog, enters a prompt, sees the task state and output, and can cancel or retry.
- The task panel validates `partialOutput`, shows a live progress preview while a task is active, and prefers final `output` after a terminal state. It does not consume `GET /v1/events` or add SSE.
- A configuration revision panel reads the Conchbase `0.5.0` v1/v2 configuration contract, also used by `0.6.0`, including its active document and history. It validates a complete `schemaVersion: 1` or `schemaVersion: 2` document, applies it, and rolls back to a known revision. It treats a missing `configuration-revisions` capability as unsupported. A v2 document requires a topology-neutral `composition` section and a runtime that advertises `composition-execution`; otherwise the panel shows an explicit unsupported message before a write. `source: url` is not accepted. The panel does not install, enable, grant, resolve secrets, load code, or execute tools.
- Deterministic tests cover Runtime API response validation, task/configuration API calls, connection status, task operations, v1/v2 configuration states, and executable repository guardrails. The guardrails allow exactly the documented task and configuration POST routes and reject arbitrary configuration writes, private-file imports, browser storage, and premature dependencies.
- The status client reads runtime capabilities as strings, including `tool-approval-ledger` on Conchbase `0.6.0`. Pagurus does not call the runtime's tool request/approval routes or render an approval workflow.
- GitHub Actions runs type checks, tests, and a production build.

Not implemented yet:

- Portable profile files, visual composition editing, MCP installation/configuration, Skill management, plugin management, policy lifecycle, secret resolution, capability grants, tool request/approval UI, SSE/event streaming, persistent console preferences, desktop packaging, and remote pairing.
- Generated client types. The typed clients mirror Conchbase's current OpenAPI contract explicitly; do not create a second schema.

Implemented capabilities are connection status, phase-1 task operations, and v1/v2 versioned configuration revision editing. Pagurus has no composition editor. Conchbase now has a published topology-neutral composition configuration section and bounded deterministic executor; Pagurus only mirrors the document shape through the Runtime API. Keep capability lifecycle rows visibly marked as planned.

## Accepted client/runtime boundaries

- Pagurus is a client. It never runs a model loop, executes tools, computes composition identity, or reads/writes Conchbase's private SQLite database.
- Conchbase's phase-1 task database has one owner at a time. Use the Runtime API or Pagurus for concurrent task inspection while `conchbase serve` is active; do not start a second task-state CLI process against the same database. Pagurus does not open or lock that database.
- Conchbase owns the API source of truth at [`conchbase/docs/openapi.yaml`](https://github.com/2648782102/conchbase/blob/main/docs/openapi.yaml). Define new runtime operations there before implementing client UI.
- All Pagurus writes use the documented versioned Runtime API. The current client write set is exactly `POST /v1/tasks`, `POST /v1/tasks/{taskId}/cancel`, `POST /v1/tasks/{taskId}/retry`, `POST /v1/configuration/validate`, and `POST /v1/configuration/apply`. Conchbase's tool request/approval routes are published runtime capabilities, not approved Pagurus writes.
- Provider credentials stay in Magpie. Pagurus sees only model ids and display names. No secret enters browser storage, frontend bundles, logs, URLs, or Git.
- Runtime enforcement remains authoritative for tools and permissions. Installing, enabling, and granting are separate concepts.
- A Skill provides instructions; it does not grant tools. Plugin execution is deferred until Conchbase defines an isolation and capability model.
- The Vite proxy is for local development only. Remote connections require an explicit authentication and pairing design.
- The current unsupported-version check is a client-side guard against the existing `/v1/health` response. It is not a negotiated versioning protocol and does not authorize new API shapes.

## Development setup

Start Conchbase in one terminal from its repository:

```sh
npm ci
npm run dev
```

Then start Pagurus in another terminal:

```sh
npm ci
npm run dev
```

Pagurus's Vite server proxies `/v1` to `http://127.0.0.1:4318`. Start Magpie and enable at least one model for live v1 task operations. Current baseline is Node.js 24+, React, TypeScript, Vite, Vitest, and npm. Run `npm run check`, `npm test`, and `npm run build` to validate changes.

- Pagurus: <https://github.com/2648782102/pagurus>.
- Runtime: <https://github.com/2648782102/conchbase>.

## Open design questions

Do not silently treat these as settled:

- Visual composition builder UX, portable profile files, validation preview beyond published field errors, secret resolution, and capability lifecycle.
- MCP catalog sources, server process lifecycle, health checks, and per-tool enable/grant UX.
- Secret entry and OS credential-store handoff without exposing secret values to browser storage.
- Skill discovery, provenance, conflict/precedence, and project-vs-user scopes.
- Plugin trust, isolation, lifecycle, and capability grants.
- Runtime discovery/pairing for multiple local or remote runtimes.
- Tool approval request presentation, decision states, task identity, and capability fallback behavior.
- SSE event display, approvals, logs, artifacts, and task history.
- Desktop shell, mobile layout scope, and localization policy.

Capability lifecycle workflows remain planned work. When an implementation depends on an open question, document options and impacts and request product direction before locking the shared API or configuration schema.

## Recommended next implementation sequence

1. Add a typed, keyboard-accessible tool request/approval client only through its own accepted ADR, using Conchbase's published `0.6.0` ledger routes and never treating an approval as execution permission.
2. Add a topology-neutral visual composition editor only through its own accepted ADR, using Conchbase's published `schemaVersion: 2` section and never defining a second schema.
3. Add SSE or an event-cursor display only after Conchbase accepts `Last-Event-ID`, retention, and reconnect semantics.
4. Add portable file import/export and capability lifecycle flows after the runtime defines their schemas and security boundaries.
5. Keep client parsing typed, keep loading/error/empty states explicit, and preserve keyboard access and narrow layouts.
