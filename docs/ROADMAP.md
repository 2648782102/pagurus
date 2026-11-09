# Roadmap

This is a direction for staged validation, not a release commitment.

## Product priority: manage and customize Agents

The product target is a user-managed collection of independently customizable Agents. Conchbase must first define and implement the shared Agent resource and versioned task-binding contract; Pagurus must then provide the editing and operational experience. The first end-to-end acceptance slice must exercise at least two Agents so independent configuration and task selection are proven.

1. Define the resource boundary: stable Agent id; name, instructions, provider-neutral default provider/model reference and bounded metadata; per-Agent immutable revisions; default/selection semantics; archival; optimistic concurrency; and distinction from existing runtime-wide capability/policy configuration.
2. Define task creation and retry semantics: explicit Agent selection for new clients; effective provider/model override precedence; atomic pinning of Agent revision, runtime configuration revision, and effective provider/model; task/event inspection; and retries that reuse the exact original execution definition. Model discovery and adapter-specific settings must follow Conchbase's provider-neutral contract.
3. Implement Conchbase persistence, a transactional/idempotent migration, validation, revision apply/rollback, Agent API and capability advertisement without deleting or rewriting existing configuration/task/event history.
4. Add Pagurus Agent collection and editor through accepted client ADRs: create, edit, duplicate, select, archive, validate, apply, history, compare/rollback, run, and inspect.
5. Prove two Agents with different instructions/models remain independent. Verify edits and rollbacks affect only newly created tasks, retries retain the original pinned revisions, archive preserves history, unknown/stale ids fail clearly, and legacy task clients still work.

The existing v1/v2 configuration editor is a generic runtime-wide JSON revision editor, not an Agent collection. The current task picker uses Conchbase's Magpie-backed compatibility catalog; that existing client behavior does not define Agent model identity or limit future provider choices. The v2 composition executor makes no model call. Keep these existing capabilities and their semantics separate from the new Agent collection; do not present them as an already completed Agent customization loop.

## Foundation and operations (partially implemented)

- Connect to a local Conchbase runtime and show actionable connection status.
- Create, inspect, cancel, and retry bounded model tasks through Conchbase's API.
- Display configuration revision history, validation state, runtime capabilities, task progress, and output.
- Generate or maintain typed clients from Conchbase's stable API contract.
- Show both runtime configuration revision and Agent revision plus the effective model on each Agent-backed task once the shared contract exposes them consistently.
- Preserve a legacy task path for clients/runtimes that do not support Agent management.

## Later capabilities

- Add topology-neutral composition editing after the Agent collection/task-binding loop is usable; keep model-driven node work and coordination semantics separate proposals.
- Add tool request/approval UI only after Conchbase defines real execution authorization and result semantics. A ledger decision alone is not permission to execute.
- Manage Skills, MCP connections, policies, and plugins only after Conchbase publishes lifecycle, secret, and grant boundaries.
- Add portable profile import/export after a stable format and migration policy are accepted.
- Add event streaming and remote pairing after Conchbase accepts reconnect, retention, authentication, and pairing contracts.
- Decide on desktop packaging based on operating-system integration needs.
- Add plugin management after Conchbase defines an isolated plugin host.
