# AI development guide

## Development target

AI coding agents are the primary implementation workflow. Optimize repository context, code boundaries, and feedback loops for an agent to complete a well-scoped change without relying on chat history. Human maintainability is not a product requirement. This describes how the software is developed; Pagurus remains an optional interface for open-ended users, alongside CLI and third-party clients.

Prefer explicit types, feature-local state, small vertical slices, and executable checks. Avoid giant components, hidden cross-feature behavior, speculative frameworks, and duplicate API contracts. Add an abstraction when it protects a real reuse, runtime, or security boundary.

The product priority is a user-managed collection of independently customizable Agents through Pagurus. Conchbase ADR 0020 defines Agent identity, per-Agent immutable revisions, task binding, and separation from runtime-wide capability/policy configuration. Pagurus ADR 0006 accepts the client surface and ADR 0007 accepts read-only task history and revision comparison. Conchbase ADR 0025 publishes the final local-first `1.0.0` contract; Pagurus ADR 0010 accepts its paired control workbench, capability directory, and write-only SecretHandle editor. Preserve the two-Agent regression matrix and existing task/configuration workflows. The v2 deterministic composition runner is not model-driven multi-agent execution. Tool approvals, visual composition design, server-side task querying, and executable capability lifecycle remain outside the accepted final target.

Agent model selection uses Conchbase's provider-neutral provider/model contract and discovery API. The legacy task fallback consumes the Magpie-backed catalog when the Agent capability is absent; do not copy Magpie-specific identifiers, catalog fields, or settings into Agent documents or the Agent UI.

## Change loop

1. Read `AGENTS.md`, `docs/AI_HANDOFF.md`, `docs/PROJECT_STATUS.json`, `docs/OBJECTIVE_MODE.zh-CN.md`, this guide, and the owning architecture/API document. Treat the current repository state as authoritative. Do not select a `blockedDirections` item without an accepted ADR.
2. Inspect `git status` and the files in the affected feature before editing. Preserve unrelated user changes.
3. Implement a complete UI slice with loading, connected, disconnected, error, and permission states where applicable. Keep runtime state authoritative in Conchbase.
4. If a feature requires a new runtime operation, define and document it in Conchbase first; never invent a competing schema here. The task history slice uses the existing `GET /v1/tasks` response; the final workbench and platform panels use only published `1.0.0` routes.
5. Do not call Conchbase's generic tool-request/approval ledger or provider-observation routes until a Pagurus ADR accepts that client contract. Agent Chat's task-scoped approval route is accepted separately by ADR 0029. A runtime capability is not authorization to add an execution route.
6. Keep `tests/repository-guardrails.test.ts` passing. Update it only alongside an accepted ADR or a documented development-boundary change. Run `npm run check`, `npm test`, and `npm run build`. Do not claim behavior that is only planned.
7. Report the files changed, commands run, results, and any unresolved decision.

## UI code boundaries

- `src/app/` composes the application, owns the ten-workspace shell, overview registry, and hash resolver, and mounts only the active feature panels.
- `src/features/<capability>/` owns feature presentation and feature-local state.
- `src/shared/api/` contains typed clients for Conchbase's public API. Validate untrusted HTTP payloads at this boundary. `http.ts` is the only `fetch` call; `guards.ts` holds generic predicates. A new client keeps its route, its validator, and its user-facing status copy, then delegates to `requestJson`; see [ADR 0038](decisions/0038-shared-runtime-transport.md).
- `src/shared/ui/` contains dependency-free presentation primitives, polling hooks, error formatting, and shared display vocabulary. It must not call the Runtime API.
- `src/styles.css` is import-only; add a workspace surface as its own layer under `src/styles/` rather than growing an existing one.
- Leaf components receive narrow typed view fields and actions. Do not pass a whole `ReturnType<typeof use...>` controller into a presenter.
- A feature panel performs mutations through its controller so busy, error, capability gating, and refresh remain one path.
- `src/features/configuration/` owns the versioned configuration document editor and its feature-local state. It mirrors the Conchbase `0.5.0` v1/v2 document union, kept by `0.6.0`, including required base sections, the v2 topology-neutral composition section, the exclusion of `source: url`, and the `composition-execution` capability guard. It must not create a second schema, credential store, capability installer, graph identity calculator, visual composition builder, or composition template.
- Add shared UI only after a real reuse exists. Do not create empty feature folders or generic state frameworks ahead of use.
- Keep keyboard access, visible focus, reduced motion, responsive behavior, and meaningful loading/error states in each implemented slice.

## Machine feedback

- `npm run check`: TypeScript validation for app and test files.
- `npm test`: Vitest tests for Runtime API responses, connection UI states, Agent/revision states, task operations and history, v1/v2 configuration states, version-2 work and platform clients, capability/SecretHandle panel no-leak fixtures, capability gating, and repository guardrails. Vitest discovers new test files under `tests/`; no package script change is needed for this slice.
- `tests/interface-validation.test.tsx` and `tests/published-contract.test.ts` are ADR 0014's executable accessibility and published-contract fixtures. They use jsdom/CSS and the paired local OpenAPI checkout; they are validation evidence, not a real-browser audit or generated client types.
- `npm run build`: production bundle and TypeScript project build.
- CI runs all three commands.
- Use deterministic local data. Never put credentials or user runtime data in fixtures, browser storage, logs, or bundles.
