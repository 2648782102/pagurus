# AI development handoff: Pagurus

This document is the starting packet for a coding model that has not seen the design conversation. It separates actual behavior from the intended product.

## Product definition

Pagurus (寄居蟹) is the optional control console for Conchbase. Users should be able to configure and inspect their agents, MCP connections, Skills, policies, and later plugins through a graphical interface. CLI and third-party clients remain valid; the UI does not become the execution authority.

Conchbase is a separate public repository and owns the actual agent loop, task state, secrets, and permission decisions. Pagurus communicates with it through the versioned Runtime API.

## Read in this order

1. `AGENTS.md` — mandatory client/security constraints.
2. `docs/ARCHITECTURE.md` — client boundary and API ownership.
3. `docs/TECH_STACK.md` — chosen and deferred UI technology.
4. `docs/ROADMAP.md` — intended product sequence.
5. `docs/VALIDATION_PLAN.md` — future automated and UI validation strategy.

## Current repository facts

Implemented:

- React + TypeScript UI built with Vite.
- Responsive overview screen with connected, disconnected, checking, and error states.
- A read-only `GET /v1/health` call through the Vite proxy to `http://127.0.0.1:4318`.
- Navigation placeholders for Agents, tools/MCP, and Skills; these are not functional management pages.
- npm scripts: `npm run dev`, `npm run check`, and `npm run build`.
- GitHub Actions runs type checking and a production build on pushes and pull requests.

Not implemented yet:

- Configuration editing, profile creation, MCP installation/configuration, Skill management, plugin management, policy editing, task creation, event streaming, approvals, persistent console preferences, desktop packaging, and remote pairing.
- Automated test suite. CI currently checks types and builds only.

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
npm install
npm run dev
```

Then run Pagurus in another terminal:

```sh
npm install
npm run dev
```

Pagurus's Vite server proxies `/v1` to `http://127.0.0.1:4318`. Current baseline is Node.js 24+, React, TypeScript, Vite, and npm. Check with `npm run check`; build with `npm run build`.

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

1. Generate or maintain a typed client from Conchbase's current API contract.
2. Show runtime identity/version/capabilities, with recovery guidance for disconnected runtimes.
3. Propose a versioned profile/config API in Conchbase before building write forms.
4. Build validation preview and apply/rollback UI against a fake runtime fixture, then the real API.
5. Add MCP and Skill flows after the runtime defines their schemas and security boundaries.
