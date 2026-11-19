# Technology baseline

- UI: React 19 and TypeScript.
- Development/build: Vite.
- Runtime connection: same-origin HTTP/JSON proxy to Conchbase loopback API.
- Live Agent Chat: resumable SSE with cancellable polling fallback.
- Tests: Vitest, Testing Library, jsdom, typed API fixtures, and paired local
  Runtime acceptance.
- Styling: feature-local CSS layers and shared design tokens; no UI state
  library until measured shared state justifies one.

The console remains web-first. Packaging, remote pairing, generated clients,
and broad capability lifecycle UI are later tasks in
[`PROJECT_PLAN.md`](PROJECT_PLAN.md), not reasons to add speculative
dependencies now.
