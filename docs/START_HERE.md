# Pagurus: start here

Pagurus is the local control surface for Conchbase, a personal Agent runtime.
It should help the user start a conversation, understand what the Agent is
doing, approve consequential actions, and recover when the Runtime is offline.

## Read only these first

1. This file.
2. [`CURRENT_STATE.md`](CURRENT_STATE.md) — implemented screens and current
   product gaps.
3. [`PROJECT_PLAN.md`](PROJECT_PLAN.md) — the shared product direction and UI
   task sequence.

Read [`DEVELOPMENT.md`](DEVELOPMENT.md) before changing code. Read
[`ARCHITECTURE.md`](ARCHITECTURE.md) for the relevant surface and
`src/shared/api/` when changing a Runtime contract. Do not search for
additional process documents before starting.

## Product in one paragraph

The default user path is: connect to Conchbase, choose or create an Agent,
send a message, watch bounded progress, approve a clear action if needed, and
inspect the result. The operator console remains useful for configuration,
history, work recovery, capabilities, and diagnostics, but it should not
dominate the first-run experience.

## Task protocol

1. Choose one Pagurus task from `PROJECT_PLAN.md`.
2. Read its Runtime dependency and acceptance checks.
3. Confirm the published Runtime route exists before adding UI behavior.
4. Add API validation and focused component tests.
5. Implement loading, success, offline, error, unsupported, and recovery paths.
6. Run checks and update `CURRENT_STATE.md` when the user-visible behavior
   changes.

## Client safety

Pagurus never opens Conchbase's database, stores a second domain schema, or
decides permissions locally. A one-time secret input is cleared immediately
after submission and is never rendered again. Model output, tool output, and
Runtime responses are untrusted data and must be bounded before rendering.
