# Validation plan

This document records current automated coverage and the next validation layers needed as console features arrive.

## Current automated coverage

- Runtime API client tests validate health/runtime response shapes, task/model response validation, provider-neutral Agent payloads, and the documented Agent/task routes.
- Task history API tests validate the existing `GET /v1/tasks` list envelope, active configuration revision, Agent task pins, legacy task omissions, and malformed responses.
- Component tests cover Agent-capable and legacy Runtime modes, model loading, task success, Agent pin inspection, cancellation, and recoverable catalog/API errors.
- Component fixtures exercise two Agent profiles independently through edit, history rollback, duplication, default selection, and archive; task operations require explicit selection and show the Runtime's effective model override.
- Component tests cover the unsupported-API-version recovery state, working Agent navigation, and planned workspaces remaining non-interactive.
- Task history component tests cover mixed Agent/legacy records, state and Agent filters, empty results, refresh failure/recovery, selection after a refreshed list, and detail output/error/partial-output states. Agent workspace tests cover changed/unchanged revision fields and same-revision comparison handling.
- Dependency-free repository guardrails check AI-first entry documents, accepted task/configuration/Agent write routes, loopback proxy, source imports, browser storage, and premature dependencies; see [ADR 0001](decisions/0001-ai-development-guardrails.md) and [ADR 0006](decisions/0006-agent-management-client.md).
- Task client tests validate `partialOutput`, and panel tests show live progress while active and prefer final `output` on completion; see [ADR 0003](decisions/0003-streaming-output-progress-client.md).
- Configuration client tests validate the Conchbase `0.5.0` v1/v2 document union kept by `0.7.0`, composition section shape, cross-check active/history ids, validation errors, apply, and rollback. Panel tests cover loading, unsupported capability, disconnected, validation, v2 apply/no-op, rollback, and keyboard states; see [ADR 0004](decisions/0004-versioned-configuration-client.md) and [ADR 0005](decisions/0005-composition-configuration-client.md).
- Guardrails verify Pagurus uses only the documented task, configuration, and Agent write routes and does not call Conchbase's tool request/approval routes.
- Repository guardrails verify task history remains a read-only consumer of `GET /v1/tasks`, contains no task write route or browser storage, and does not define a second task schema.
- Conchbase ADR 0021's paired-runtime acceptance dynamically imports these published clients and verifies the two-Agent loop, revision pins, stale writes, override/archive/default behavior, configuration apply/rollback, cancellation, restart interruption, retry, event replay, legacy `/v1/tasks`, CLI compatibility, v1/v2 dispatch, deterministic composition, streaming, invalid payloads, and unsupported-provider failure without fallback over live loopback HTTP. Bodyless cancel/retry POSTs do not declare a JSON content type.
- GitHub Actions runs `npm run check`, `npm test`, and `npm run build`.

This covers Agent management and task binding, read-only task history, revision comparison, legacy task compatibility, v1/v2 configuration revisions, read-only durable-work inspection, executable repository boundaries, deterministic local HTTP acceptance, and a completed manual/visual ADR 0007 screen walkthrough against a real local Runtime. Deterministic workbench fixtures validate published GET routes, response shapes, capability gating, unsupported/loading/empty/offline states, detail evidence, no work writes, and absence of a secret sentinel. The earlier visual walkthrough used a temporary database and the user's configured Magpie gateway; it verified mixed Agent/legacy records, server-pinned fields, success and provider-error output, state/Agent filters, explicit refresh, offline error/recovery, read-only revision comparison, Agent/configuration screens, and a 320px viewport. One selected model returned HTTP 429, providing a visible failure fixture. It does not validate visual composition editing, future work-control actions, capability lifecycle workflows, portable files, server-side task pagination/filtering, SSE task events, tool approval UI, real secret handling, automated accessibility, or real-provider conformance because those features or validation layers remain separate work.

## Required validation layers as features arrive

1. **Unit:** API client parsing, connection-state transitions, configuration diff presentation, and error mapping.
2. **Component:** connected/offline/loading/error states, keyboard navigation, visible focus, labels, and disabled actions.
3. **Contract:** validate client types and fixtures against the OpenAPI contract in the Conchbase repository; include model override, optimistic conflict, history rollback, and legacy payload scenarios.
4. **Integration:** fake Runtime API with deterministic responses; no provider secrets and no public-network dependency.
5. **Visual/accessibility/manual:** narrow and wide viewport screenshots, reduced-motion preference, keyboard-only navigation, automated accessibility checks, and a complete screen walkthrough against a real local Conchbase runtime.
6. **Real-provider conformance:** selected local provider fixtures that do not enter CI credentials and remain distinct from ADR 0021's deterministic fake gateway.
7. **Future work controls and SecretHandle no-leak:** after separate accepted contracts, sentinel fixtures must prove no plaintext secret enters component state, browser storage, URLs, logs, errors, or client responses; control fixtures must cover authorization, denied, stopped, resumed, delivery-pending, and offline states without inventing a second Runtime schema.

## Initial critical scenarios

- Runtime offline: explain how to start it and offer a retry action.
- Runtime returns an unsupported API version: show incompatibility and recovery guidance.
- Configuration validation fails: show field-level errors without applying the change.
- Runtime asks for approval: render the exact requested action and wait for the runtime's decision.
- Two Agents have distinct instructions/models: verify the task response pins the correct Agent revision and effective model for each.
- Deterministic paired live-runtime acceptance: verify profile/configuration changes cannot alter pinned tasks, Agent cancellation and interruption/retry preserve their revision, and global v1/v2 plus legacy task behavior remains intact. Real-provider and visual/manual UI validation are separate layers.
- A configuration change is applied: display the new active revision and preserve task/revision history.
- Secret entry: keep values out of browser storage, URLs, logs, and error telemetry.
- 320px viewport and keyboard-only navigation: no hidden controls or color-only status.
