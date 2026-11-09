# Validation plan

This document records current automated coverage and the next validation layers needed as console features arrive.

## Current automated coverage

- Runtime API client tests validate health/runtime response shapes, task/model response validation, provider-neutral Agent payloads, and the documented Agent/task routes.
- Component tests cover Agent-capable and legacy Runtime modes, model loading, task success, Agent pin inspection, cancellation, and recoverable catalog/API errors.
- Component fixtures exercise two Agent profiles independently through edit, history rollback, duplication, default selection, and archive; task operations require explicit selection and show the Runtime's effective model override.
- Component tests cover the unsupported-API-version recovery state, working Agent navigation, and planned workspaces remaining non-interactive.
- Dependency-free repository guardrails check AI-first entry documents, accepted task/configuration/Agent write routes, loopback proxy, source imports, browser storage, and premature dependencies; see [ADR 0001](decisions/0001-ai-development-guardrails.md) and [ADR 0006](decisions/0006-agent-management-client.md).
- Task client tests validate `partialOutput`, and panel tests show live progress while active and prefer final `output` on completion; see [ADR 0003](decisions/0003-streaming-output-progress-client.md).
- Configuration client tests validate the Conchbase `0.5.0` v1/v2 document union kept by `0.7.0`, composition section shape, cross-check active/history ids, validation errors, apply, and rollback. Panel tests cover loading, unsupported capability, disconnected, validation, v2 apply/no-op, rollback, and keyboard states; see [ADR 0004](decisions/0004-versioned-configuration-client.md) and [ADR 0005](decisions/0005-composition-configuration-client.md).
- Guardrails verify Pagurus uses only the documented task, configuration, and Agent write routes and does not call Conchbase's tool request/approval routes.
- GitHub Actions runs `npm run check`, `npm test`, and `npm run build`.

This covers Agent management and task binding, legacy task compatibility, v1/v2 configuration revisions, and executable repository boundaries. It does not validate visual composition editing, capability lifecycle workflows, portable files, SSE task events, tool approval UI, or real secret handling because those features do not exist yet.

## Required validation layers as features arrive

1. **Unit:** API client parsing, connection-state transitions, configuration diff presentation, and error mapping.
2. **Component:** connected/offline/loading/error states, keyboard navigation, visible focus, labels, and disabled actions.
3. **Contract:** validate client types and fixtures against the OpenAPI contract in the Conchbase repository; include model override, optimistic conflict, history rollback, and legacy payload scenarios.
4. **Integration:** fake Runtime API with deterministic responses; no provider secrets and no public-network dependency.
5. **Visual/accessibility:** narrow and wide viewport screenshots, reduced-motion preference, keyboard-only navigation, and automated accessibility checks.

## Initial critical scenarios

- Runtime offline: explain how to start it and offer a retry action.
- Runtime returns an unsupported API version: show incompatibility and recovery guidance.
- Configuration validation fails: show field-level errors without applying the change.
- Runtime asks for approval: render the exact requested action and wait for the runtime's decision.
- Two Agents have distinct instructions/models: verify the task response pins the correct Agent revision and effective model for each.
- Paired live-runtime acceptance: verify profile/configuration changes cannot alter pinned tasks, Agent cancellation and interruption/retry preserve their revision, and global v1/v2 plus legacy task behavior remains intact.
- A configuration change is applied: display the new active revision and preserve task/revision history.
- Secret entry: keep values out of browser storage, URLs, logs, and error telemetry.
- 320px viewport and keyboard-only navigation: no hidden controls or color-only status.
