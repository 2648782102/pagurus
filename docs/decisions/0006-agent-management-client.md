# Decision 0006: Agent management and task binding client

Status: **accepted for the Conchbase 0.8.0 Agent Runtime API**

Date: 2026-11-09 (Asia/Shanghai)

## Context

Conchbase [ADR 0020](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0020-multi-agent-and-provider-neutral-model-contract.md) publishes runtime-local Agent profiles, immutable revisions, provider-neutral model discovery, optimistic updates, default/archive behavior, and Agent-bound task creation. The existing runtime-wide configuration remains a separate policy/capability document. Legacy runtimes continue to expose task and configuration capabilities without Agent routes.

Pagurus's current task form selects a legacy model string from `/v1/models`. The current catalog is Magpie-backed and is retained for compatibility. New Agent profiles and Agent task requests use `/v1/model-catalog` `{providerId, modelId}` values and the published Agent API. Pagurus must keep Conchbase authoritative for validation, persistence, execution, and task identity.

## Decision

- Add a first-class Agent collection and editor with create, edit, duplicate, explicit selection/default, soft archive, provider/model selection, immutable revision history, and rollback by applying a historical revision.
- Use `/v1/agents`, `/v1/agents/{agentId}`, `/v1/agents/{agentId}/duplicate`, `/v1/agents/{agentId}/archive`, `/v1/agents/{agentId}/revisions/apply`, `/v1/agents/default`, and `/v1/model-catalog` exactly as published by Conchbase. Updates and revision apply use `expectedRevisionId` for optimistic concurrency.
- Agent task creation uses existing `POST /v1/tasks` with `{prompt, agentId, modelOverride?}`. Legacy task creation remains `{prompt, model}`. Do not mix the shapes and do not set an implicit default Agent when the user has not selected one.
- Task inspection shows the pinned Agent name/id/revision, effective `{providerId, modelId}`, and runtime `configurationRevisionId`. Existing task state, progress, output, cancel, and retry controls remain available.
- Capability detection is additive. When `agents` is absent, keep the current legacy task form and configuration editor operational. Show an explicit unsupported state in the Agent workspace and do not call Agent endpoints.
- Preserve credentials in Conchbase/provider configuration. Pagurus neither requests nor stores credential values. Agent instructions are not presented as permissions or tool grants.
- Use Conchbase as the sole source of schema and errors. Validate response envelopes and bounded fields at the API client. A stale update (409) is shown with a reload action and must not be retried automatically.

## Alternatives considered

1. Repurpose the global configuration JSON editor for Agents. Rejected because Agent identity/revision and runtime policy configuration have independent ownership and task semantics.
2. Add Agent CRUD routes in Pagurus without Conchbase's API. Rejected because clients must not write runtime-private state or invent a second contract.
3. Replace the current task form entirely. Rejected because older runtimes may not advertise `agents`; the existing legacy workflow must remain usable.

## Consequences

Pagurus provides the first complete Agent editing/task-selection surface while remaining a client. The screen can manage any provider listed by Conchbase's catalog without embedding Magpie-specific fields. It does not provide visual composition editing, tool approvals, capability installation, secret entry, or remote pairing.

## Validation

- API tests use mocked fetch to verify exact Agent routes, payloads, envelopes, and provider-neutral catalog values.
- Component tests cover Agent-capable and legacy runtimes, multiple independent profiles, edit/duplicate/default/archive/history rollback, task binding and inspection, stale conflicts, and explicit loading/error/empty states.
- Repository guardrails permit the newly accepted Agent POST/PATCH/PUT routes while continuing to reject arbitrary Runtime writes, private-file access, browser storage, credential fields, and tool-ledger calls.
- Run `npm run check`, `npm test`, and `npm run build`.
