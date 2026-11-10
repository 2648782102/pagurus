# Instructions for coding agents

This project is built primarily by AI coding agents. Optimize architecture, documentation, and validation for agents to understand, change, and verify bounded tasks quickly. Human handoff is not a product requirement. Keep code explicit and legible; this principle is not permission for opaque code or speculative abstraction.

Read `docs/AI_HANDOFF.md` first, then `docs/AI_DEVELOPMENT.md` and the linked architecture and technology documents. Treat this repository as the source of truth; do not rely on context from another chat.

## Product invariants

- Pagurus (寄居蟹) is an optional configuration and operations UI for Conchbase.
- The product direction is user-managed, multiple-Agent configuration through Pagurus. Prioritize an Agent collection and a complete versioned edit/validate/apply/run/inspect loop before advanced tool-approval or extension-management UI. Each task must remain bound to the selected Agent revision while preserving the existing runtime-wide policy/capability configuration boundary.
- Keep Agent model references and controls provider-neutral according to Conchbase's published contract. Magpie is the current compatibility path; do not make its catalog, ids, or settings the Agent schema or the only future provider choice.
- Conchbase owns model execution, task state, secrets, and permission enforcement.
- Pagurus ADR 0009 accepts a read-only human-attention workbench over Conchbase `0.9.0` `GET /v1/work/items`, `GET /v1/work/items/{workItemId}`, and `GET /v1/work/delivery-receipts`, gated on `durable-work-contract`. ADR 0008's write-only SecretHandle editor and work-control actions remain proposals; do not invent durable work schemas, a second work state, secret values, or new write routes.
- Plaintext secrets must never enter browser storage, the frontend bundle, URLs, logs, errors, client state, or model context. A client may show handle keys, metadata, and digest-only use receipts, never a value or decryptable resolver token.
- Use Conchbase's versioned API. Never read or write its private files/database.
- A UI selection or installation must not bypass the runtime's per-tool authorization.
- Do not put provider/tool credentials in browser storage, frontend bundles, logs, or Git.
- Accepted Pagurus writes are the published task create/cancel/retry, configuration validate/apply, and Agent create/update/duplicate/archive/default/revision-apply routes. Conchbase additionally publishes tool request/approval ledger routes, but Pagurus has no accepted client ADR or UI for them yet.
- Configuration documents are versioned data; they do not install, enable, grant, resolve secrets, load code, or execute tools.
- Remote runtime pairing and capability lifecycle operations are not implemented yet.
- Keep `src/shared/api/work.ts` read-only. Do not call `POST /v1/work/triggers` or add start/stop, resume, approval, execution, or secret-resolution controls before a separate accepted client ADR.

## UI and change discipline

- Distinguish current behavior from roadmap items. Do not present placeholder navigation as working configuration.
- Keep loading, connected, disconnected, error, and permission states explicit.
- Preserve keyboard access, visible focus, reduced-motion behavior, and narrow layouts.
- Keep UI state separate from authoritative runtime state.
- If a feature needs a new Runtime API, propose and document it in Conchbase first; do not invent a second schema here.
- Record meaningful UI/API decisions in `docs/` and mark undecided choices as proposals.
- Keep `tests/repository-guardrails.test.ts` passing; update it only alongside an accepted ADR or a documented development-boundary change.
- Run `npm run check`, `npm test`, and `npm run build` after code changes. CI runs all three commands.

