# Decision 0015: Organization Console product direction

Status: **accepted paired client product direction; development boundary; no client or Runtime API contract changes**

Date: 2026-11-13 (Asia/Shanghai).

## Context

Pagurus `1.0.0` is a local-first control client for Conchbase. It submits user intent and reads state only through the published Runtime API. ADR 0010 closes that client contract, ADR 0011 defines the AI handoff boundary, ADR 0013 defines the seven-workspace console, and ADR 0014 closes executable interface validation. Pagurus does not own Agent identity, execution state, durable work, capability policy, or SecretHandle value custody.

Conchbase [ADR 0030](../../docs/decisions/0030-organization-runtime-direction.md) accepts a new product direction: one durable primary conversation with a default entry Agent, dynamic Runtime-validated worker Agents, bounded delegation, concurrent work, quiet reporting, and archival project history. This ADR records how Pagurus should relate to that direction.

The user-facing metaphor may call the entry Agent a boss Agent and the recruiting behavior HR, but these are not fixed UI role types. Conchbase remains topology-neutral; Pagurus must not invent a competing role taxonomy or Agent schema.

This ADR accepts only a paired product direction and development boundary. It does not add a workspace, route, component, client method, stored state, generated schema, or Runtime behavior.

## Product direction

Pagurus should eventually provide an **Organization Console** experience for supervising the single-entry Agent model. It should make the Runtime-owned organization legible without giving the user another session to manage. The console's job is not to orchestrate work itself; it is to present published state and collect bounded user intent.

The intended client experience is:

1. A primary conversation remains the main place where the user talks to the entry Agent.
2. A project view shows the projects inferred from that conversation and their Runtime state.
3. A worker or delegation view shows which published Agents are active, who authorized them, their scope, budget, and status when those facts are published.
4. An attention view shows concrete questions or decisions that require the user.
5. A report/archive view shows summaries and historical project threads without deleting or rewriting them.
6. Settings remain about user-authored root Agent behavior and client preferences, not a second user-maintained definition of every Runtime-created worker.

This direction extends the existing console philosophy; it does not replace the closed `1.0.0` workspaces. A later paired decision may decide whether these capabilities become new workspaces, sections within existing workspaces, or a separate mode.

## Accepted client principles

### 1. Pagurus remains a client

Pagurus must not read or write Conchbase private files or databases. It must not create Agent revisions locally, calculate authorization outcomes, decide project lifecycle, schedule workers, or classify waiting-on-human from free text. All such facts come from published, versioned Runtime contracts.

When the Runtime does not yet publish a capability, Pagurus may document a visual direction. A local prototype may exist only as a non-authoritative fixture; it must not present itself as connected behavior and must not create a competing persisted schema.

### 2. One primary conversation, many inspected contexts

The user should not need one UI session per worker. The console may show many project or worker contexts, but they are inspectable details of the same organization. Any future conversation surface must be clearly distinguished from project threads: the primary conversation accepts user intent; project threads carry bounded execution history and reports published by the Runtime.

Pagurus must not silently turn a project thread into an additional peer conversation that the user is expected to maintain.

### 3. Attention first

The panel should answer, in order:

1. What needs me now?
2. Is the organization healthy and doing the right things?
3. What is the complete history of one project or delegation?

Concrete attention requests, failures, and blocked work come before routine progress. Healthy background work should be quiet. Destructive or authority-changing actions require explicit user confirmation.

### 4. Structured states only

Labels and actions must derive from structured Runtime state. Natural-language summaries can be displayed, but they cannot be the only evidence for status, authorization, waiting, completion, or failure.

Pagurus should avoid presenting model metaphors as machine facts. For example, “worker” may be a friendly label for a Runtime-created Agent revision, while “can recruit,” “scope,” “budget,” and “expires” must come from structured fields.

### 5. Root Agent configuration is the primary control surface

Users configure the boss or root Agent's goals, style, reporting preferences, recruitment behavior, limits, and escalation preferences. Dynamically created worker definitions are records to inspect, not a second configuration system users must maintain by hand.

A later contract may allow a successful Runtime-created Agent definition to be promoted into a reusable template. That capability is deferred and must be backed by Conchbase's published contract.

### 6. No second Runtime schema

The paired local OpenAPI remains the Runtime contract source of truth. Pagurus must not generate or hand-maintain a competing organization schema, invent endpoint semantics, or map unsupported drafts onto existing Task or WorkItem shapes merely to render a view.

All new typed clients, route paths, fixtures, and event renderers require a versioned Conchbase contract first and a paired Pagurus implementation decision. This ADR does not authorize local mock endpoints as a substitute for that contract.

## Boundaries and non-goals

This ADR does not accept:

- new UI routes, workspace ids, client methods, or navigation entries;
- direct access to Agent files, SQLite state, local Sources, or SecretHandle values;
- local simulation of organization lifecycle presented as live behavior;
- fixed boss/HR/employee roles or a canonical organization chart;
- arbitrary model-authored UI actions or tool execution from the console;
- generated clients or changes to the frozen 47-path contract;
- claims that any organization console capability is implemented.

Provider-specific configuration remains behind Runtime adapters. Pagurus must not expose Magpie-specific role or session concepts as Organization Runtime facts.

## Options considered

### A. Add a second session manager to Pagurus

Consequences: gives each worker a visible conversation, but recreates the user burden the product is meant to remove and risks a second execution authority. Rejected.

### B. Render a static organization chart from model-written prose

Consequences: visually simple, but makes free text authoritative and hides authorization, recovery, and state transitions. Rejected.

### C. Inspect Runtime-owned organization state from a single primary console

Consequences: preserves Runtime authority, keeps the user in one entry point, and allows the panel to focus on attention, health, and history. It requires later paired API and UI decisions. Accepted.

## Relationship to Conchbase ADR 0030

Conchbase owns or will own under later accepted contracts:

  - primary-session structure;
  - project and delegation lifecycle;
  - Runtime-validated Agent revisions;
  - authorization inheritance, budgets, TTL, and recursion limits;
  - work execution, reports, archive/resume, and durable events.

Pagurus may eventually own only:

  - presentation of published state;
  - user-intent forms constrained by published commands;
  - local client preferences that do not alter Runtime semantics;
  - accessibility and deterministic fixtures over those views.

## Development implications

Before implementation, later decisions must define the versioned Runtime contract and the matching Pagurus surface. This ADR does not change `docs/PROJECT_STATUS.json` or `docs/AI_TASK_QUEUE.md`. Those decisions should cover:

1. how a primary conversation and project context are represented to clients;
2. how active, idle, archived, and resumed projects are displayed;
3. how attention requests are answered through published commands;
4. how delegated agents, scopes, budgets, and expiry are rendered honestly;
5. how confirmations protect destructive or authority-changing actions;
6. how fixtures cover attention ordering, structured states, focus, responsive behavior, and absence of private Runtime access.

Existing `v1.0.0` release notes and assets remain immutable publication snapshots. The frozen 47-path client contract remains unchanged until a new versioned paired ADR accepts its evolution.

## Consequences

Pagurus now has an accepted direction for making a single-entry, dynamically organized Runtime understandable without becoming a second Runtime. It can prepare designs, fixtures, and documentation that aim toward attention-first supervision while preserving the existing client invariants.

The cost is that no UI slice is directly executable from this ADR alone. That is intentional: organization concepts must first exist in published Runtime contracts before the client turns them into controls.

> Paired product direction and development boundary only: this ADR does not add a client feature, public contract, release, or deferred product capability.
