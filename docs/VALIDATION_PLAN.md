# Validation plan

This document records current automated coverage and the next validation layers needed as console features arrive.

## Current automated coverage

- Runtime API client tests validate health/runtime response shapes, malformed payloads, HTTP error handling, task/model response validation, and the accepted task/cancel/retry POST routes.
- Component tests cover the checking, disconnected, retry, connected, model-loading, task success, cancellation, and model-catalog error states.
- Component tests cover the unsupported-API-version recovery state and assert planned workspaces are non-interactive.
- Dependency-free repository guardrails check AI-first entry documents, the accepted phase-1 task-write/loopback client boundary, source imports, browser storage, configuration write calls, and premature dependencies. Synthetic violation fixtures prove the checks reject representative boundary breaks; see [ADR 0001](decisions/0001-ai-development-guardrails.md) and [ADR 0002](decisions/0002-phase-one-task-operations.md).
- Task client tests validate Conchbase `0.4.0`'s `partialOutput`, and panel tests show live progress while active and prefer final `output` on completion; see [ADR 0003](decisions/0003-streaming-output-progress-client.md).
- Configuration client tests validate Conchbase `0.4.0` documents, cross-check active/history ids, validation errors, apply, and rollback. Panel tests cover loading, unsupported capability, disconnected, validation, apply/no-op, rollback, and keyboard states; see [ADR 0004](decisions/0004-versioned-configuration-client.md).
- GitHub Actions runs `npm run check`, `npm test`, and `npm run build`.

This is a phase-1 baseline plus versioned configuration revisions and executable repository boundaries. It does not validate capability lifecycle workflows, portable files, composition, SSE task events, approvals, or real secret handling because those features do not exist yet.

## Required validation layers as features arrive

1. **Unit:** API client parsing, connection-state transitions, configuration diff presentation, and error mapping.
2. **Component:** connected/offline/loading/error states, keyboard navigation, visible focus, labels, and disabled actions.
3. **Contract:** validate client types and fixtures against the OpenAPI contract in the Conchbase repository.
4. **Integration:** fake Runtime API with deterministic responses; no provider secrets and no public-network dependency.
5. **Visual/accessibility:** narrow and wide viewport screenshots, reduced-motion preference, keyboard-only navigation, and automated accessibility checks.

## Initial critical scenarios

- Runtime offline: explain how to start it and offer a retry action.
- Runtime returns an unsupported API version: show incompatibility and recovery guidance.
- Configuration validation fails: show field-level errors without applying the change.
- Runtime asks for approval: render the exact requested action and wait for the runtime's decision.
- A configuration change is applied: display the new active revision and preserve task/revision history.
- Secret entry: keep values out of browser storage, URLs, logs, and error telemetry.
- 320px viewport and keyboard-only navigation: no hidden controls or color-only status.
