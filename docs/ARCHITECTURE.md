# Pagurus architecture

Pagurus is a client, not an Agent runtime. It renders published Conchbase
state and submits explicit user requests.

## Surfaces

- `src/agent/` is the personal Agent surface: conversation, history, model
  indicator, progress, approval, context, and answer presentation.
- `src/app/` is the advanced operator shell and workspace navigation.
- `src/features/` owns feature-local state and panels.
- `src/shared/api/` owns Runtime transport, payload validation, and typed
  domain clients.
- `src/shared/ui/` owns genuinely reused presentation primitives.
- `src/styles/` owns ordered visual layers.

## Data flow

```text
Runtime HTTP/SSE
  -> shared/api validators
  -> feature hook/controller
  -> narrow typed view model
  -> panel or Agent surface
```

`src/shared/api/http.ts` is the transport boundary. A feature must not call
`fetch` directly or parse private Runtime state. The client should show the
Runtime's state, not recreate a state machine from partial responses.

## UX direction

The default path should be conversation-first. Configuration, revisions,
capabilities, work recovery, and diagnostics remain available as advanced
surfaces. The UI should make progress and consequential actions legible while
keeping technical IDs, provider details, and raw payloads secondary.

## Security

No browser storage for credentials or plaintext SecretHandle values. One-shot
secret input is cleared after submission. Never render a generic resolver,
read `.conchbase`, open SQLite, or infer permission from a button state. Every
write is a published Runtime route and every surface is capability-gated where
the contract requires it.

## Testing

Use API validator tests, component tests, paired fake-Runtime tests, and real
browser checks for keyboard, narrow layout, reduced motion, reconnect, and
streaming. See [`VALIDATION_PLAN.md`](VALIDATION_PLAN.md).
