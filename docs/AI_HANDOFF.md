# AI development handoff: Pagurus

> **AI-first project:** Pagurus is developed primarily by AI coding agents. Optimize the repository for fast, accurate agent context loading, bounded changes, and deterministic validation; human handoff is not a product requirement. Keep implementation explicit, typed, and easy to inspect. Start with `AGENTS.md`, then follow this handoff.

This document is the starting packet for a coding model that has not seen the design conversation. It separates actual behavior from the intended product.

## Product definition

Pagurus (寄居蟹) is the optional Agent configuration and operations console for Conchbase. The product direction is that users define and tune multiple Agents through Pagurus, then run and inspect tasks against a chosen Agent revision. Conchbase is a separate public repository and owns the agent loop, Agent identity and revision state, task state, secrets, runtime-wide policy, and permission decisions. Pagurus is a client of its versioned Runtime API; CLI and third-party clients remain valid, and Pagurus does not become the execution authority.

The first Agent resource and task-binding contract is implemented in Conchbase ADR 0020; Pagurus ADR 0006 implements the first client vertical slice. Conchbase ADR 0021 closes deterministic live loopback acceptance for at least two Agents with independently configured profiles: Pagurus's published clients, the real Fastify Runtime, and a fake Magpie-compatible gateway run over local HTTP without real credentials or private database access. The runtime-wide configuration remains separate from Agent profiles. The v2 composition executor is deterministic scaffolding rather than model-driven multi-agent execution.

Provider compatibility is an implementation detail, not the product definition. Agent definitions and model-selection UI use Conchbase's provider-neutral provider/model identity and catalog. The task UI falls back to the Magpie-backed legacy catalog only when Agent capability is absent. Keep Magpie working as one compatibility adapter; do not encode its catalog shape or settings in Agent revisions, and do not assume it is the only provider.

Conchbase [ADR 0022](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0022-persistent-work-runtime-direction.md) accepts durable, event-driven, topology-neutral work as product direction. [ADR 0008](decisions/0008-human-attention-workbench-proposal.md) proposes that Pagurus eventually show work needing authorization, stopping, resumption, or acceptance, along with Mandate scope, Assignment state, Outbox, and DeliveryReceipt evidence. A WorkItem is not a chat Session and may outlive several execution attempts. Conchbase [ADR 0023](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0023-secret-handle-and-runtime-injection-proposal.md) proposes a central write-only SecretHandle registry; Pagurus may eventually submit a value once and show key, version, status, grant, and digest-only use receipts, never plaintext after creation. Both are proposals here. No route, source file, component, browser storage, or second schema is added.

## Read in this order

1. `AGENTS.md` — mandatory client/security constraints and AI-first development rule.
2. This handoff, then `docs/AI_DEVELOPMENT.md`.
3. [ADR 0002](decisions/0002-phase-one-task-operations.md) — accepted phase-1 task operations client.
4. [ADR 0003](decisions/0003-streaming-output-progress-client.md) — accepted streaming progress client.
5. [ADR 0004](decisions/0004-versioned-configuration-client.md) — accepted Conchbase `0.4.0` v1 configuration revision client.
6. [ADR 0005](decisions/0005-composition-configuration-client.md) — accepted Conchbase `0.5.0` v1/v2 composition configuration client; `0.7.0` keeps the same configuration document union.
7. [ADR 0006](decisions/0006-agent-management-client.md) — accepted Agent management and task binding client contract.
8. [ADR 0007](decisions/0007-task-history-and-revision-comparison-client.md) — accepted read-only task history and Agent revision comparison client contract.
9. [ADR 0008](decisions/0008-human-attention-workbench-proposal.md) — proposed human-attention workbench and write-only SecretHandle editor; no client contract change.
10. `docs/ARCHITECTURE.md`, `docs/TECH_STACK.md`, and `src/shared/api/` — client boundary and typed API clients.
11. `docs/ROADMAP.md`, `docs/VALIDATION_PLAN.md`, and [ADR 0001](decisions/0001-ai-development-guardrails.md) — planned work, validation, and executable boundaries.
12. Conchbase's `docs/AI_HANDOFF.md`, `docs/openapi.yaml`, and `docs/AI_TASK_QUEUE.md` — the authoritative cross-repository contract and sequencing.
13. Conchbase [ADR 0011](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0011-phase-one-database-instance-ownership.md), [ADR 0012](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0012-streaming-output-progress.md), [ADR 0014](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0014-versioned-configuration-api.md), [ADR 0015](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0015-composition-identity-kernel.md), [ADR 0016](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0016-composition-execution-and-public-schema.md), [ADR 0017](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0017-public-tool-request-approval-ledger.md), [ADR 0019](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0019-explicit-provider-tool-call-observation-boundary.md), [ADR 0021](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0021-cross-repository-paired-runtime-acceptance.md), [ADR 0022](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0022-persistent-work-runtime-direction.md), and proposed [ADR 0023](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0023-secret-handle-and-runtime-injection-proposal.md) — runtime boundaries and direction.

## Current repository facts

Implemented:

- React + TypeScript UI built with Vite, with responsive connection status and explicit checking, connected, disconnected, and unsupported-API-version states.
- Read-only `GET /v1/health` and `GET /v1/runtime` calls through the loopback Vite proxy, with response validation at the API boundary.
- Task operations use Agent-bound creation when `agents` and `provider-neutral-model-catalog` are advertised, otherwise the legacy Magpie catalog and `{prompt, model}` request. Agent mode supports explicit Agent selection and one-task model override. Polling, cancellation, explicit retry, and task output work across both modes. Task inspection shows the pinned Agent identity/revision, Runtime configuration revision, and effective provider/model.
- The Agent workspace uses the provider-neutral catalog and published Agent routes for create, edit, duplicate, default selection, archive, immutable history, and rollback by appending historical content as a new revision. Stale updates surface a conflict and can be reloaded. Agent instructions do not grant tools or permissions.
- The task panel validates `partialOutput`, shows a live progress preview while a task is active, and prefers final `output` after a terminal state. It does not consume `GET /v1/events` or add SSE.
- The task history panel reads the existing `GET /v1/tasks` list, displays mixed Agent and legacy tasks, filters by state and Agent, and shows the server-pinned Agent revision, runtime configuration revision, effective provider/model, prompt, output, partial output, and error. Refresh is explicit; the panel does not add pagination, server-side filters, SSE, or event reconstruction.
- The Agent workspace compares two immutable revisions as a read-only field-level view for name, instructions, provider/model, and revision id. It does not write revisions, create a diff artifact, or persist selection preferences.
- A configuration revision panel reads the versioned v1/v2 runtime-wide configuration contract, including active document and history. It validates a complete document, applies it, and rolls back to a known revision. It treats a missing `configuration-revisions` capability as unsupported. A v2 document requires a topology-neutral `composition` section and a runtime that advertises `composition-execution`; otherwise the panel shows an explicit unsupported message before a write. `source: url` is not accepted. The panel does not install, enable, grant, resolve secrets, load code, or execute tools.
- Deterministic tests cover Runtime API response validation, task/configuration API calls, connection status, task operations, v1/v2 configuration states, and executable repository guardrails. The guardrails allow exactly the documented task and configuration POST routes and reject arbitrary configuration writes, private-file imports, browser storage, and premature dependencies.
- Conchbase's ADR 0021 paired-runtime acceptance dynamically imports these published clients and verifies the two-Agent loop, revision pins, stale writes, override/archive/default behavior, configuration apply/rollback, cancellation, restart interruption, retry, event replay, legacy task dispatch, v1/v2 composition, streaming, validation errors, and CLI compatibility over live loopback HTTP. Bodyless cancel/retry POSTs do not declare a JSON content type. This is deterministic API acceptance, not visual/manual UI or real-provider validation. ADR 0007's manual/visual screen walkthrough has since been completed against a real local Runtime with the user's configured Magpie gateway; it covered mixed Agent/legacy tasks, provider success/error records, state/Agent filters, refresh/recovery, revision comparison, and a 320px viewport. It is not automated real-provider conformance or accessibility validation.
- The status client reads runtime capabilities as strings, including `agents`, `provider-neutral-model-catalog`, `tool-approval-ledger`, and `provider-tool-call-observation`. Pagurus does not call the runtime's tool request/approval or observation routes or render an approval/observation workflow.
- GitHub Actions runs type checks, tests, and a production build.
- ADR 0008 is a direction record only. The current Runtime API clients, accepted write routes, dependency baseline, loopback proxy, and no-browser-secret-storage boundary are unchanged.

Not implemented yet:

- Portable profile files, visual composition editing, MCP installation/configuration, Skill management, plugin management, policy lifecycle, secret resolution, capability grants, tool request/approval UI, SSE/event streaming, server-side task pagination/filtering, persistent console preferences, desktop packaging, and remote pairing.
- ADR 0008's human-attention workbench, WorkItem/Assignment/DeliveryReceipt views, write-only SecretHandle editor, handle rotation, and digest-only use receipts.
- Generated client types. The typed clients mirror Conchbase's current OpenAPI contract explicitly; do not create a second schema.

Implemented capabilities are connection status, Agent collection and revision management, Agent-bound task creation/inspection, legacy task operations, and v1/v2 versioned configuration revision editing. Pagurus has no composition editor. Conchbase has a published topology-neutral composition configuration section and bounded deterministic executor; Pagurus only mirrors the document shape through the Runtime API. Keep capability lifecycle rows visibly marked as planned.

The existing configuration panel edits one generic runtime-wide policy/capability JSON revision; it is not an Agent profile. Agent profiles have independent revisions in Conchbase. Agent task requests explicitly select a profile, may override its default provider/model, and pin both the Agent and active Runtime configuration revisions. Agent tasks use one model turn and do not implicitly run the global v2 deterministic graph.

## Accepted client/runtime boundaries

- Pagurus is a client. It never runs a model loop, executes tools, computes composition identity, or reads/writes Conchbase's private SQLite database.
- Conchbase's phase-1 task database has one owner at a time. Use the Runtime API or Pagurus for concurrent task inspection while `conchbase serve` is active; do not start a second task-state CLI process against the same database. Pagurus does not open or lock that database.
- Conchbase owns the API source of truth at [`conchbase/docs/openapi.yaml`](https://github.com/2648782102/conchbase/blob/main/docs/openapi.yaml). Define new runtime operations there before implementing client UI.
- All Pagurus writes use the documented versioned Runtime API. The client writes task create/cancel/retry, configuration validate/apply, and Agent create/update/duplicate/archive/default/revision-apply routes under accepted ADR 0006. Conchbase's tool request/approval routes are not Pagurus writes.
- Provider credentials and provider-specific settings remain behind the Conchbase adapter boundary; Pagurus must not store or receive secrets. No secret enters browser storage, frontend bundles, logs, URLs, or Git.
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

Pagurus's Vite server proxies `/v1` to `http://127.0.0.1:4318`. The current Conchbase compatibility adapter uses Magpie, so start Magpie and enable at least one model for live v1 task operations. This setup requirement describes the current implementation, not a product restriction; future provider choices must come from Conchbase's provider-neutral contract. Current baseline is Node.js 24+, React, TypeScript, Vite, Vitest, and npm. Run `npm run check`, `npm test`, and `npm run build` to validate changes.

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
- SSE event display, approvals, logs, artifacts, production-scale task querying, and live task history updates.
- Workbench information architecture, authorization/stop/resume/accept states, delivery evidence presentation, and a write-only handle editor that never renders plaintext.
- Desktop shell, mobile layout scope, and localization policy.

Capability lifecycle workflows remain planned work. When an implementation depends on an open question, document options and impacts and request product direction before locking the shared API or configuration schema.

## Recommended next implementation sequence

1. Wait for Conchbase's accepted durable-work domain/API ADR, then accept a paired Pagurus workbench ADR and implement a read-only attention view over published routes. Do not invent a second work state.
2. Wait for Conchbase's accepted SecretHandle, local authorization, adapter-isolation, and redaction contracts, then accept a separate write-only editor ADR with sentinel no-leak fixtures.
3. Add real-provider conformance and accessibility validation as distinct layers. The complete-screen manual/visual ADR 0007 walkthrough is complete; do not add a competing Runtime schema or tool-approval UI.
4. If task volume requires it, design a separate Conchbase API contract for ordering, retention, pagination, filtering, and live updates before expanding the history client.
