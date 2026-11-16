# Decision 0040: A separate Agent product surface

Status: **accepted client architecture and product-surface boundary; no Runtime
API, route, or client-schema changes**

Date: 2026-11-16 (Asia/Shanghai).

## Context

Every surface Pagurus shipped so far is an operator console: ten workspaces for
runtime policy, capability records, write-only SecretHandles, execution audits,
durable work, and task history. That is the right shape for developing,
debugging, and inspecting a Runtime, and the wrong shape for a person who simply
wants to talk to an Agent.

The console's Agent Chat panel already had the hard parts — a versioned
conversation contract, resumable SSE, a polling fallback, inline tool approval,
and a pinned model revision. Bundling them inside the console meant the shipped
product inherited console navigation, console chrome, and operator vocabulary.

## Decision

1. **One build, two surfaces.** `src/app/surface.ts` reads a `?surface=` query
   parameter. The default, and every existing `#workspace` link, keep the
   operator console; `?surface=agent` renders the product app. The hash stays
   owned by console workspace routing, so no bookmarked console URL changes
   meaning and the two surfaces cannot collide.
2. **The product owns its shell, not its facts.** `src/agent/` owns
   `AgentApp.tsx`, `AgentSidebar.tsx`, and `useAgentSurface.ts`. It renders its
   own identity rail and conversation layout and has no workspace switcher,
   runtime policy, capability directory, secret editor, or execution audit.
   Those are operator tools.
3. **One chat controller.** Both surfaces use `useAgentChat` and
   `useAgentChatStream`. There is no second message model, no second SSE client,
   and no parallel approval path. The only difference is entry behaviour, passed
   as `{ autoResume }`.
4. **Resume means resume something real.** The Runtime lists conversations
   newest-created first, so the head of the list is frequently a thread the user
   opened and abandoned. The product resumes the newest thread with
   `messageCount > 0`; if none exists it lands on the picker. Empty threads are
   hidden from both the rail and the picker.
5. **Auto-resume happens once, in the load path.** It is a property of the
   initial `loadAgents({ restoreLatest })` call rather than a second effect that
   watches React state. Starting a new conversation therefore cannot be undone
   by a later poll re-entering the old thread.
6. **Both directions are linked.** The console topbar links to the product
   surface; the product rail links back to the console. Operators can check what
   a user sees, and a user can reach diagnostics.
7. **No new dependency, no new route.** The product surface consumes the
   published `agentChatContract: 1.8.0` routes only. It does not read private
   Runtime state, store credentials in the browser, or add a Runtime path.

## Options

### A. Keep one console and hide operator workspaces behind a flag

Consequences: the product inherits console navigation, chrome, and vocabulary,
and every operator feature has to be conditionally suppressed. Rejected.

### B. A second application package or a second build

Consequences: two dependency trees, two dev servers, and a duplicate chat
controller that would drift from the console's SSE and approval behaviour.
Rejected.

### C. One build, two surfaces, one client core

Consequences: no dependency or contract change, one chat implementation, and a
product shell that can diverge in layout without diverging in facts. Accepted.

## Validation

- `npm run check`, `npm test`, and `npm run build`.
- `tests/surface.test.ts` covers parameter resolution and the round-trip link.
- `tests/agent-app.test.tsx` covers launch-time resume, skipping an abandoned
  empty conversation, hiding operator-only surfaces, and staying on the picker
  after "new conversation".
- Existing console tests are unchanged, so the console keeps its ten workspaces
  and its explicit Agent picker entry.
- Manual loopback check: the product resumed an existing conversation, rendered
  a real model reply, updated its sidebar history, and switched back to the
  console through its rail link.

## Consequences

New user-facing behaviour belongs in `src/agent/`. New operator diagnostics
belong in the console. Anything both need stays in `features/` or `shared/` and
is consumed by both, so the product cannot quietly grow a second implementation
of Runtime truth.

This decision does not accept desktop packaging, remote pairing, a second
provider path, or any change to the published Agent Chat contract.
