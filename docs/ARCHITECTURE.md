# Pagurus architecture

Pagurus is a user interface and client SDK for Conchbase. It does not run the agent loop or enforce permissions locally.

## Client boundary

- The web console uses the versioned HTTP/JSON Runtime API and subscribes to resumable SSE events.
- Development uses a same-origin Vite proxy to the loopback runtime.
- A production console should be served from the runtime origin or paired to an explicitly authorized local endpoint.
- The runtime owns secrets, active configuration revisions, task state, and policy enforcement.
- Conchbase owns the current machine-readable API source of truth at [`docs/openapi.yaml`](https://github.com/2648782102/conchbase/blob/main/docs/openapi.yaml). Do not copy or independently redefine that contract here.

## Initial screen

The current screen reports runtime connectivity and lists the planned configuration areas: Agents, tools/MCP connections, and Skills. It contains no write operations.

The current client calls `GET /v1/health` and `GET /v1/runtime` to show API/runtime versions, capabilities, and connection state. It does not create tasks, stream events, or manage configuration.

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
