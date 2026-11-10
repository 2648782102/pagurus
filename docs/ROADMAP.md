# Roadmap

This is a direction for staged validation, not a release commitment.

## Product priority: manage and customize Agents

The product target is a user-managed collection of independently customizable Agents. Conchbase ADR 0020 and Pagurus ADR 0006 have implemented the shared Agent resource and first client editing/operational slice. Conchbase ADR 0021 closes deterministic paired live-runtime acceptance for at least two independent Agents over local loopback HTTP. Pagurus ADR 0007's manual/visual screen walkthrough is complete; automated real-provider conformance and accessibility validation remain separate future layers.

1. **Implemented:** Conchbase persists stable Agent ids and immutable revisions, validates provider-neutral defaults, supports default/archive/history/rollback, and performs additive migration.
2. **Implemented:** Agent tasks explicitly bind the selected revision and pin the Runtime configuration revision plus effective provider/model. Retry preserves the original execution definition; legacy task behavior remains.
3. **Implemented:** Pagurus supports create, edit, duplicate, selection/default, archive, history/rollback, provider-neutral model selection, Agent-bound task launch, and task inspection. Older runtimes keep the legacy task flow.
4. **Implemented deterministic acceptance:** ADR 0021 verifies task pins across edits/config changes, model override, retry after edit/archive, cancellation/interruption, stale ids, default changes, global v1/v2 behavior, legacy `/v1/tasks`, CLI compatibility, streaming, and event replay over paired local HTTP runtimes. Deterministic API and UI fixtures also prove Agent A/B profile isolation, lifecycle operations, selection, and effective-model display.
5. **Implemented read-only inspection:** ADR 0007 adds mixed Agent/legacy task history from the existing `GET /v1/tasks` route and field-level comparison for immutable Agent revisions. It adds no Runtime route and keeps all existing write and fallback paths.
6. **Implemented manual/visual validation:** A real local Runtime with the user's configured Magpie gateway and a temporary database was used to walk through ADR 0007's history, filters, success/error details, refresh/recovery, revision comparison, Agent/configuration screens, and a 320px viewport. One model returned HTTP 429, providing a visible failure fixture. This is not automated real-provider conformance or accessibility validation.

The existing v1/v2 configuration editor remains a generic runtime-wide JSON revision editor, separate from the Agent collection. The legacy task picker still uses Conchbase's Magpie-backed compatibility catalog when Agent capability is unavailable; this does not define Agent model identity or limit provider choices. The v2 composition executor makes no model call and Agent tasks do not implicitly run it.

## Product direction: human-attention workbench (read-only slice implemented)

Conchbase ADR 0022 accepts durable, event-driven work as direction; Conchbase ADR 0024 publishes the `0.9.0` deterministic work contract. Pagurus [ADR 0009](decisions/0009-read-only-attention-workbench-client.md) implements a capability-gated, read-only attention view over three published GET routes, with typed response validation and no second work schema. Pagurus remains a versioned Runtime API client; it never owns work identity, delivery evidence, secrets, or permission enforcement. Proposed [ADR 0008](decisions/0008-human-attention-workbench-proposal.md) keeps authorization, stop/resume/acceptance actions and a write-only handle editor for separate accepted client slices after Conchbase publishes execution and SecretHandle contracts. No work write route, secret value field, browser storage, or second schema is added now.

## Foundation and operations (partially implemented)

- Connect to a local Conchbase runtime and show actionable connection status.
- Create, inspect, cancel, and retry bounded model tasks through Conchbase's API.
- Display configuration revision history, validation state, runtime capabilities, task progress, and output.
- Generate or maintain typed clients from Conchbase's stable API contract.
- Show both runtime configuration revision and Agent revision plus the effective model on each Agent-backed task.
- Preserve a legacy task path for clients/runtimes that do not support Agent management.
- Inspect persisted task history with state/Agent filters and server-pinned task details.
- Compare two immutable Agent revisions without editing or persisting client-side preference state.

## Later capabilities

- Add topology-neutral composition editing after the Agent collection/task-binding loop is usable; keep model-driven node work and coordination semantics separate proposals.
- Add tool request/approval UI only after Conchbase defines real execution authorization and result semantics. A ledger decision alone is not permission to execute.
- Manage Skills, MCP connections, policies, and plugins only after Conchbase publishes lifecycle, secret, and grant boundaries.
- Add portable profile import/export after a stable format and migration policy are accepted.
- Add event streaming and remote pairing after Conchbase accepts reconnect, retention, authentication, and pairing contracts.
- Add server-side history pagination/filtering or live updates only after Conchbase accepts ordering, retention, cursor, and transport contracts.
- Decide on desktop packaging based on operating-system integration needs.
- Add plugin management after Conchbase defines an isolated plugin host.
