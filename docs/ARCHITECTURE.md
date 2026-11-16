# Pagurus architecture

Pagurus is a user interface and client SDK for Conchbase. It does not run the agent loop or enforce permissions locally.

## Client boundary

- The web console uses the versioned HTTP/JSON Runtime API. Task operations poll individual task state, while task history explicitly reads the existing complete `GET /v1/tasks` list. Agent Chat consumes its own resumable 1.8.0 SSE projection and keeps a cancellable polling fallback; a generic Runtime event browser remains future work.
- Development uses a same-origin Vite proxy to the loopback runtime.
- A production console should be served from the runtime origin or paired to an explicitly authorized local endpoint.
- The runtime owns secrets, active configuration revisions, task state, and policy enforcement.
- Conchbase owns the current machine-readable API source of truth at [`docs/openapi.yaml`](https://github.com/2648782102/conchbase/blob/main/docs/openapi.yaml). Do not copy or independently redefine that contract here.
- Agent collection and per-Agent immutable revision state belong to Conchbase. They stay distinct from the single runtime-wide policy/capability configuration. An Agent-backed task displays Agent identity/revision, runtime configuration revision, and effective provider/model.

## Implemented screens

`src/app/useWorkspace.ts` defines ten hash-based workspaces and resolves legacy feature anchors to their owning view. `src/app/workspace-registry.ts` owns the overview's quick-entry and directory groups. `src/app/App.tsx` owns the persistent sidebar, console status bar, page heading, and active-surface composition; only the active feature panels mount. The overview reports runtime connectivity and links every implemented workspace: organization, Agent Chat, controlled execution, Agent management, task operations, task history, durable-work control, runtime configuration, the capability directory, and write-only SecretHandles. All rows are live; capability records remain bounded configuration data rather than installers or grants. The shell changes presentation only: Conchbase remains authoritative and no Runtime API route or typed client changes; see [ADR 0013](decisions/0013-console-workspace-navigation.md).

The status client calls `GET /v1/health` and `GET /v1/runtime` to show API/runtime versions, capabilities, and connection state; tool ledger and provider observation capabilities are read-only context. When `agents` and `provider-neutral-model-catalog` are advertised, the Agent workspace uses the published Agent and model catalog routes for collection editing, immutable history, default/archive, and rollback, plus a read-only comparison of two returned revisions. When those capabilities are absent, it shows an unsupported state and does not call Agent endpoints. The task client retains the legacy Magpie catalog and `{prompt, model}` shape for older runtimes; Agent-capable runtimes use `{prompt, agentId, modelOverride?}` and the provider-neutral catalog. Both modes share polling, progress, cancel, and retry controls. The task history client uses `GET /v1/tasks` to display mixed Agent and legacy records, state/Agent filters, and server-pinned details. Agent task inspection shows the pinned Agent revision, Runtime configuration revision, and effective provider/model. The configuration client uses the versioned configuration contract for active revision, history, validate, and apply/rollback routes, mirrors the v1/v2 union, renders field-level errors, gates v2 writes on `composition-execution`, and does not consume event cursor, tool request/approval, or observation routes.

The configuration screen edits the runtime-wide configuration revision; it is not an Agent profile. Agent writes use only Conchbase's documented API. Stale revision conflicts are visible and can be resolved by reloading. Agent management capability checks preserve existing task and configuration flows on older runtimes.

The legacy model picker reflects Conchbase's Magpie-backed compatibility catalog. Agent editing and task selection use provider-neutral provider/model identities and discovery, preserving Magpie compatibility without encoding its catalog or settings fields into Agent profiles.

Task history and revision comparison are inspection surfaces. They do not own task ordering, retention, pagination, revision identity, model selection, or execution semantics. A future production-scale history surface must begin with a Conchbase contract for those concerns.

[ADR 0010](decisions/0010-final-local-first-client.md) implements the paired Conchbase `1.0.0` control client. `src/shared/api/work.ts` mirrors version-2 work reads and published control writes; `src/shared/api/platform.ts` mirrors the local Source, capability directory, SecretHandle, and digest-only receipt routes. The workbench gates reads and delivery decisions on `durable-work-contract`, start/stop/complete/reconcile on `asynchronous-work-control`, and local Source events on `local-source-policy`. The capability panel gates on `capability-directory`, and the SecretHandle panel gates on `write-only-secret-handles`. ADR 0008 remains a historical proposal and ADR 0009 remains the historical read-only slice. Pagurus never defines Runtime work state, reads private state, stores browser secrets, renders plaintext after submission, or installs/grants/executes capabilities.

The write-only editor submits one `value` through a password input, clears it before awaiting the request result, and never reads it back. The Runtime seals values with a process-scoped AES-256-GCM key; a restart invalidates old sealed values and the fixed adapter returns a digest-only `denied` receipt until the value is rotated. Pagurus displays only keys, versions, status, adapter/destination binding, digests, timestamps, and receipt outcomes.

## Future desktop shell

Keep the UI web-first. A native desktop wrapper can be selected after installer, system tray, and operating-system integration requirements are defined. The wrapper must remain a Runtime API client.

## Source layout

```text
src/
├── app/                            # console composition, page shell, surface switch
├── agent/                          # the shipped Agent product shell (no operator tools)
├── features/<capability>/          # feature UI and its local state
├── shared/
│   ├── api/                        # typed clients for Conchbase's public API
│   └── ui/                         # dependency-free primitives, polling, display vocabulary
└── styles/                         # ordered cascade layers; styles.css is import-only
```

## Two surfaces, one client core

`src/app/surface.ts` chooses a surface from `?surface=`. The default is the
operator console, and every `#workspace` link keeps working unchanged. With
`?surface=agent`, `src/agent/AgentApp.tsx` renders the shipped product: an
identity rail, one conversation, and a link back to the console.

The product is a different shell, not a different client. Both surfaces call
`useAgentChat` and `useAgentChatStream`, so the conversation contract, SSE
resumption, polling fallback, and inline approval exist once. The single
difference is entry behaviour: the console lands on a picker, the product
resumes the newest thread that actually contains messages. See
[ADR 0040](decisions/0040-agent-product-surface.md).

Keep operator diagnostics in the console and user-facing behaviour in
`src/agent/`. Anything both need belongs in `features/` or `shared/`; the
product must never grow a second path to Runtime truth.

The product shell adopts interaction patterns common to agent apps — a
collapsible session rail, recency grouping, history search, a fixed composer, a
model indicator, and copy on a reply — while using only this repository's
primitives and design tokens. It copies no other product's brand, copy, code,
or stylesheet values, and it adds no second agent loop or schema.

Keep a feature's UI and state together. Put only genuinely reused, runtime-independent UI in a shared area. A component receives explicit typed view fields and actions rather than a whole controller. A panel performs writes through its feature controller, not by importing a transport client directly. Keep HTTP parsing at the API boundary. Add feature folders when implementing real behavior; do not pre-create placeholder packages or layers. Conchbase remains the only owner of API schemas and runtime state.

## Transport and validation

`src/shared/api/http.ts` is the only module that calls `fetch` for the Runtime.
It composes `Accept`, derives `Content-Type` from whether a body actually
exists, JSON-encodes bodies, forwards the abort signal, and translates a failed
status through a caller-supplied mapper. `requestJson` validates the payload
before returning it; `fetchJson` is the deliberately narrow read-only probe that
never parses an error body.

Each domain module still owns its published routes, its payload validators, and
its user-facing status copy. `runtime.ts`, `agents.ts`, `tasks.ts`,
`configuration.ts`, `work.ts`, `organization.ts`, `execution.ts`, and
`execution-runs.ts` keep their existing exported helper names so callers,
tests, and Conchbase's paired Runtime acceptance do not change. See
[ADR 0038](decisions/0038-shared-runtime-transport.md).

Three domains that outgrew one reviewable unit are layered behind an unchanged
facade. `organization.ts`, `work.ts`, and `configuration.ts` remain the
documented import paths and re-export:

- `<domain>-contract.ts` — versioned records, published paths, constants, and
  payload validators; no transport.
- `<domain>-client.ts` — typed reads and accepted writes over `http.ts`.
- `<domain>-selectors.ts` — pure projections of an already-published payload,
  used by `organization` only; these never perform a request.

Validators were moved verbatim. A list route and a detail route describe the
same record differently, and those differences are contract facts rather than
style. See [ADR 0039](decisions/0039-domain-module-layering.md).

`platform.ts` was three domains in one file, so it now re-exports
`capabilities.ts`, `local-source.ts`, and `secret-handles.ts`. Capability
records, local Source events, and write-only SecretHandles share the version-2
wire rules but not a lifecycle; keeping them apart means a SecretHandle change
has no path to a capability write.

`src/shared/api/guards.ts` owns the primitive payload predicates
(`isRecord`, bounded strings, string arrays, nullable values, `hasOnlyKeys`,
versioned records). Contract-shaped validators stay in their domain module
because they encode that contract, not a generic JSON question.

## Styles

`src/styles.css` is an import entry point only. It declares the cascade order:
tokens, primitives, base, shell, page, and one layer per workspace surface.
`tests/architecture.test.ts` caps each layer at 300 lines and the entry point at
30 lines, so a new surface adds a layer instead of extending the largest file.
