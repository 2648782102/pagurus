# Instructions for coding agents

This project is built primarily by AI coding agents. Optimize architecture, documentation, and validation for agents to understand, change, and verify bounded tasks quickly. Human handoff is not a product requirement. Keep code explicit and legible; this principle is not permission for opaque code or speculative abstraction.

Read `docs/AI_HANDOFF.md` first, then `docs/AI_DEVELOPMENT.md` and the linked architecture and technology documents. Treat this repository as the source of truth; do not rely on context from another chat.

## Product invariants

- Pagurus (寄居蟹) is an optional configuration and operations UI for Conchbase.
- Conchbase owns model execution, task state, secrets, and permission enforcement.
- Use Conchbase's versioned API. Never read or write its private files/database.
- A UI selection or installation must not bypass the runtime's per-tool authorization.
- Do not put provider/tool credentials in browser storage, frontend bundles, logs, or Git.
- Conchbase's published phase-1 task, cancel, and retry routes are the only accepted write operations.
- Remote runtime pairing and configuration write operations are not implemented yet.

## UI and change discipline

- Distinguish current behavior from roadmap items. Do not present placeholder navigation as working configuration.
- Keep loading, connected, disconnected, error, and permission states explicit.
- Preserve keyboard access, visible focus, reduced-motion behavior, and narrow layouts.
- Keep UI state separate from authoritative runtime state.
- If a feature needs a new Runtime API, propose and document it in Conchbase first; do not invent a second schema here.
- Record meaningful UI/API decisions in `docs/` and mark undecided choices as proposals.
- Keep `tests/repository-guardrails.test.ts` passing; update it only alongside an accepted ADR or a documented development-boundary change.
- Run `npm run check`, `npm test`, and `npm run build` after code changes. CI runs all three commands.

