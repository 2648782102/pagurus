# AI development handoff: Pagurus

> **AI-first project:** Pagurus is developed primarily by AI coding agents. Optimize the repository for fast, accurate agent context loading, bounded changes, and deterministic validation; human handoff is not a product requirement. Keep implementation explicit, typed, and easy to inspect. Start with `AGENTS.md`, then follow this handoff.

This document is the starting packet for a coding model that has not seen the design conversation. It separates actual behavior from the intended product.

## Product definition

Pagurus (寄居蟹) is the optional control console for Conchbase. Users should be able to configure and inspect their agents, MCP connections, Skills, policies, and later plugins through a graphical interface. CLI and third-party clients remain valid; the UI does not become the execution authority.

Conchbase is a separate public repository and owns the actual agent loop, task state, secrets, and permission decisions. Pagurus communicates with it through the versioned Runtime API.

## Read in this order

1. `AGENTS.md` — mandatory client/security constraints and AI-first development rule.
2. `docs/AI_DEVELOPMENT.md` — how to make and validate focused changes in this repository.
3. `docs/ARCHITECTURE.md` — client boundary, API ownership, and current source layout.
4. `docs/TECH_STACK.md` — chosen and deferred UI technology.
5. `docs/decisions/0001-ai-development-guardrails.md` — accepted executable development guardrails, not a public contract.
6. `docs/ROADMAP.md` — intended product sequence.
7. `docs/VALIDATION_PLAN.md` — current automated and future UI validation strategy.
8. Conchbase's `docs/AI_TASK_QUEUE.md` — current cross-repository sequencing and unresolved public contracts.

## Current repository facts

Implemented:

- React + TypeScript UI built with Vite.
- Responsive overview screen with connected, disconnected, checking, and error states.
- Explicit unsupported-Runtime-API-version state with recovery guidance.
- Read-only `GET /v1/health` and `GET /v1/runtime` calls through the Vite proxy to `http://127.0.0.1:4318`, with response validation at the API boundary.
- Navigation placeholders for Agents, tools/MCP, and Skills; these are not functional management pages.
- npm scripts: `npm run dev`, `npm run check`, `npm test`, and `npm run build`.
- Automated tests cover Runtime API response validation and connection status UI states.
- Tests assert that planned navigation is not presented as a functional link.
- Deterministic repository guardrails enforce the read-only/loopback client boundary and reject premature imports, browser storage, write-fetch calls, and dependencies. See [ADR 0001](decisions/0001-ai-development-guardrails.md) and `tests/repository-guardrails.test.ts`.
- GitHub Actions runs type checks, tests, and a production build on pushes and pull requests.

Not implemented yet:

- Configuration editing, profile creation, MCP installation/configuration, Skill management, plugin management, policy editing, task creation, event streaming, approvals, persistent console preferences, desktop packaging, and remote pairing.

Do not tell users that Pagurus can configure an agent yet; its current capability is a connection-status scaffold.

## Accepted client/runtime boundaries

- Pagurus is a client. It never runs a model loop or executes tools.
- Conchbase's API is authoritative. The current source contract is [`conchbase/docs/openapi.yaml`](https://github.com/2648782102/conchbase/blob/main/docs/openapi.yaml); current routes are read-only status endpoints.
- All future writes go through explicit Conchbase API operations that validate, preview, and apply configuration revisions. Do not implement direct filesystem or database access.
- Runtime enforcement remains authoritative for tools and permissions. Installing, enabling, and granting are separate concepts.
- A Skill provides instructions; it does not grant tools. Plugin execution is deferred until Conchbase defines an isolation and capability model.
- The Vite proxy is for local development only. Remote connections require explicit authentication and pairing design.

## Development setup

Run Conchbase in one terminal from its repository:

```sh
npm ci
npm run dev
```

Then run Pagurus in another terminal:

```sh
npm ci
npm run dev
```

Pagurus's Vite server proxies `/v1` to `http://127.0.0.1:4318`. Current baseline is Node.js 24+, React, TypeScript, Vite, Vitest, and npm. Run `npm run check`, `npm test`, and `npm run build` to validate changes.

- Pagurus: <https://github.com/2648782102/pagurus>.
- Runtime: <https://github.com/2648782102/conchbase>.
- The API contract belongs to Conchbase. Propose API changes there before building dependent UI.

## Open design questions

Do not silently treat these as settled:

- Agent/profile and configuration schemas, validation preview, revision history, apply/rollback flow.
- MCP catalog sources, server process lifecycle, health checks, and per-tool enable/grant UX.
- Secret entry and OS credential-store handoff without exposing secret values to browser storage.
- Skill discovery, provenance, conflict/precedence, and project-vs-user scopes.
- Plugin trust, isolation, lifecycle, and capability grants.
- Runtime discovery/pairing for multiple local or remote runtimes.
- Task-event display, approvals, logs, and artifact access.
- Desktop shell, mobile layout scope, and localization policy.

When an implementation depends on one of these, document options and impacts and request product direction before locking the shared API or configuration schema.

## Recommended first implementation sequence

1. Keep API response parsing typed and validated at the HTTP boundary. Read Conchbase's `docs/AI_TASK_QUEUE.md` before starting client work; keep the repository guardrails passing and generate the client only once the broader API contract is accepted.
2. Propose a versioned profile/config API in Conchbase before building write forms.
3. Build validation preview and apply/rollback UI against a fake runtime fixture, then the real API.
4. Add MCP and Skill flows after the runtime defines their schemas and security boundaries.

The current unsupported-version check is a client-side guard against the existing `/v1/health` response. It is not a negotiated versioning protocol and does not authorize new API shapes.
