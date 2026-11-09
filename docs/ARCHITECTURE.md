# Pagurus architecture

Pagurus is a user interface and client SDK for Conchbase. It does not run the agent loop or enforce permissions locally.

## Client boundary

- The web console uses the versioned HTTP/JSON Runtime API. Phase 1 polls task state; SSE remains a future transport after Conchbase accepts its event envelope.
- Development uses a same-origin Vite proxy to the loopback runtime.
- A production console should be served from the runtime origin or paired to an explicitly authorized local endpoint.
- The runtime owns secrets, active configuration revisions, task state, and policy enforcement.
- Conchbase owns the current machine-readable API source of truth at [`docs/openapi.yaml`](https://github.com/2648782102/conchbase/blob/main/docs/openapi.yaml). Do not copy or independently redefine that contract here.
- Agent collection and per-Agent immutable revision state belong to Conchbase. They stay distinct from the single runtime-wide policy/capability configuration. An Agent-backed task displays Agent identity/revision, runtime configuration revision, and effective provider/model.

## Implemented screens

The overview reports runtime connectivity, links to Agent management, task operations, and the runtime configuration editor, and lists planned capability lifecycle areas for tools/MCP connections and Skills. Those planned rows remain non-interactive.

The status client calls `GET /v1/health` and `GET /v1/runtime` to show API/runtime versions, capabilities, and connection state; tool ledger and provider observation capabilities are read-only context. When `agents` and `provider-neutral-model-catalog` are advertised, the Agent workspace uses the published Agent and model catalog routes for collection editing, immutable history, default/archive, and rollback. When those capabilities are absent, it shows an unsupported state and does not call Agent endpoints. The task client retains the legacy Magpie catalog and `{prompt, model}` shape for older runtimes; Agent-capable runtimes use `{prompt, agentId, modelOverride?}` and the provider-neutral catalog. Both modes share polling, progress, cancel, and retry controls. Agent task inspection shows the pinned Agent revision, Runtime configuration revision, and effective provider/model. The configuration client uses the versioned configuration contract for active revision, history, validate, and apply/rollback routes, mirrors the v1/v2 union, renders field-level errors, gates v2 writes on `composition-execution`, and does not consume event cursor, tool request/approval, or observation routes.

The configuration screen edits the runtime-wide configuration revision; it is not an Agent profile. Agent writes use only Conchbase's documented API. Stale revision conflicts are visible and can be resolved by reloading. Agent management capability checks preserve existing task and configuration flows on older runtimes.

The legacy model picker reflects Conchbase's Magpie-backed compatibility catalog. Agent editing and task selection use provider-neutral provider/model identities and discovery, preserving Magpie compatibility without encoding its catalog or settings fields into Agent profiles.

## Future desktop shell

Keep the UI web-first. A native desktop wrapper can be selected after installer, system tray, and operating-system integration requirements are defined. The wrapper must remain a Runtime API client.

## Source layout

```text
src/
├── app/                            # application composition and page shell
├── features/<capability>/          # feature UI and its local state
└── shared/api/                     # typed clients for Conchbase's public API
```

Keep a feature's UI and state together. Put only genuinely reused, runtime-independent UI in a shared area. Keep HTTP parsing at the API boundary and pass typed data into feature components. Add feature folders when implementing real behavior; do not pre-create placeholder packages or layers. Conchbase remains the only owner of API schemas and runtime state.
