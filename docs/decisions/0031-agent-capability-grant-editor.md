# Decision 0031: Agent capability grant editor

Status: **accepted and implemented Agent capability grant editor**

Date: 2026-11-15 (Asia/Shanghai).

## Context

Conchbase ADR 0066 makes `grantedCapabilities` part of the immutable Agent revision and enforces it in `TaskService`: an Agent with no grants receives no tools and no Skills. Before that change every Agent silently received the Runtime-wide maximum, so no console surface was needed.

Now the Runtime default is fail-closed. A user who creates an Agent in Pagurus and never sees the grant list would produce an Agent that cannot read a file or use a Skill, and would have no way to fix it from the product's own control client. That is a usability defect produced by a Runtime correctness fix.

The console must not invent a second capability schema, cannot widen grants on the user's behalf, and must not compute authority.

## Decision

1. The Agent editor gains a capability section bound to the published `grantedCapabilities` field on `AgentProfile` and `AgentRevision`. There is no console-only schema and no local default.
2. The editor shows two independent lists — tools and Skills — each entry being `{ kind, name }`. Entries are entered as bounded names and normalized by the Runtime, so the console never sorts, deduplicates, or validates beyond the published pattern.
3. Both lists are edited as one draft. Saving still goes through the existing `POST /v1/agents` / `PATCH /v1/agents/{agentId}` contract with `expectedRevisionId`, so a concurrent edit still fails with `409` and the console shows the Runtime's error verbatim.
4. The editor displays the Runtime's current grant set as the authoritative state, including an explicit empty state that says "未授权任何能力，该 Agent 无法调用工具或 Skill". This makes the fail-closed default visible rather than surprising.
5. The compare view includes grants, so a revision diff answers "what changed in authority", not only "what changed in prose".
6. The client validates only shape needed to build a request: `kind` from the closed set, name characters matching the published pattern, and an 64-entry cap. Anything else is left to the Runtime.
7. The console never offers a "grant everything" shortcut. There is no bulk widening action, because the Runtime treats grants as explicit authority.
8. No new Runtime route, schema, or capability flag is introduced. The surface is gated on the existing `agents` capability, exactly like the rest of the editor.

## Options

### A. Only show grants read-only

Consequences: a fail-closed Runtime would be unusable from the console; users would have to hand-write JSON against the API. Rejected.

### B. Grant everything by default in the console

Consequences: re-creates the pre-ADR-0066 behavior in the client, hides the authority decision, and contradicts the Runtime boundary. Rejected.

### C. Explicit two-list editor with a visible empty state

Consequences: the user sees exactly what the Agent may use, defaults stay fail-closed, and the Runtime remains the validator. Accepted.

## Validation

- `src/features/agents/useAgents.ts` derives the draft from the selected revision and sends it unchanged.
- `src/features/agents/AgentWorkspace.tsx` renders the tool and Skill lists, the empty state, and the grant comparison row.
- Existing console tests cover the editor's create, save, and rollback paths; a fixture asserts an Agent with no grants round-trips through the editor without inventing a grant.
- `npm run check`, `npm test`, and `npm run build` pass.

## Consequences

The console can express the authority it previously could not, and the fail-closed Runtime default becomes visible instead of mysterious. Grants stay revisioned and auditable through the same mechanism as instructions and model choice.
