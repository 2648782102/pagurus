# Decision 0024: Boss Agent in Agent Chat console

Status: **accepted paired client contract for Conchbase Boss Agent adapter**

Date: 2026-11-14 (Asia/Shanghai).

## Context

Conchbase ADR 0047 exposes Boss Mode as a Runtime-owned virtual 老板 Agent inside the `1.5.0` Agent Chat list. Pagurus ADR 0023 currently treats every Agent Chat option as a normal configured Agent with a provider/model reply. The client should prefer and clearly label the Boss Agent without turning it into a local organization controller.

## Decision

1. Pagurus continues to use the frozen `1.5.0` Agent Chat paths and schemas. No new Runtime route or response field is introduced.
2. The typed client recognizes the published Boss Agent by its Runtime-owned `providerId: "runtime"` and `modelId: "组织编排"` identity and exposes an `isBossAgent` helper.
3. The Agent Chat picker prefers 老板 Agent when the Runtime publishes it. Selecting it creates and messages a normal `1.5.0` conversation; the Runtime routes those messages through Boss Mode.
4. The panel labels Boss Agent as organization orchestration and explains that it submits intents to the single primary conversation, creates projects/workers, and returns structured reports/Attention. It does not call `/v1/organization/*` directly.
5. Normal configured Agents keep their existing direct model-reply behavior. Boss Agent replies remain Runtime-published facts; Pagurus does not compute authority, fabricate worker state, or present local optimistic messages as published.
6. Unsupported Runtime, Boss submit failure, and stale conversation errors are visible bounded states.
7. Validation covers typed-client Boss identification, picker preference, organization-mode label, message submit, pending/terminal Boss reply rendering, and unchanged normal-Agent chat. Both repositories must pass `npm run check`, `npm test`, and `npm run build`.

## Options

### A. Add a separate Boss chat workspace

Consequences: recreates the split between normal Agent chat and Boss Mode that ADR 0047 removes. Rejected.

### B. Treat Boss Agent as a normal editable Agent

Consequences: implies user-editable instructions/model own organization authority. Rejected.

### C. Prefer the Runtime-owned Boss Agent inside the existing Agent Chat workspace

Consequences: preserves one conversational entry point and Runtime authority with no new public contract. Accepted.

## Consequences

Pagurus now presents 老板 Agent as the default conversational entry inside Agent Chat while normal configured Agents remain available. Organization authority stays in Conchbase.

> Paired client contract: this ADR covers only Conchbase ADR 0047's virtual Boss Agent adapter.
