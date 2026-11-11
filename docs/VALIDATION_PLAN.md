# Validation plan

This document records current automated coverage and the next validation layers needed as console features arrive.

## Current automated coverage

- Runtime API client tests validate health/runtime response shapes, task/model response validation, provider-neutral Agent payloads, and the documented Agent/task routes.
- Task history API tests validate the existing `GET /v1/tasks` list envelope, active configuration revision, Agent task pins, legacy task omissions, and malformed responses.
- Component tests cover Agent-capable and legacy Runtime modes, model loading, task success, Agent pin inspection, cancellation, and recoverable catalog/API errors.
- Component fixtures exercise two Agent profiles independently through edit, history rollback, duplication, default selection, and archive; task operations require explicit selection and show the Runtime's effective model override.
- Component tests cover the unsupported-API-version recovery state, working Agent navigation, and every final local-first workspace being a live link.
- Workspace navigation tests cover legacy anchor resolution, single-workspace rendering, hash transitions, active navigation state, the skip link, labeled navigation, exact accessible names, and exclusive capability/SecretHandle panel mounting; see [ADR 0013](decisions/0013-console-workspace-navigation.md).
- `tests/interface-validation.test.tsx` is an executable jsdom/CSS accessibility fixture covering skip-link focus, keyboard navigation through all seven workspace links, active-page state, visible focus, reduced motion, and narrow/wide responsive CSS boundaries. It is not a real-browser WCAG audit; see [ADR 0014](decisions/0014-interface-validation-boundary.md).
- `tests/published-contract.test.ts` is an executable local contract fixture. It checks the explicit typed-client route/method inventory and, when the paired Conchbase checkout is present, aligns those routes and fixture envelope names with the published 47-path OpenAPI. It generates no client types and does not fetch a remote spec.
- Task history component tests cover mixed Agent/legacy records, state and Agent filters, empty results, refresh failure/recovery, selection after a refreshed list, and detail output/error/partial-output states. Agent workspace tests cover changed/unchanged revision fields and same-revision comparison handling.
- Dependency-free repository guardrails check AI-first entry documents, accepted task/configuration/Agent/work/platform write routes, loopback proxy, source imports, browser storage, capability gating, no generic secret resolver, and premature dependencies; see [ADR 0001](decisions/0001-ai-development-guardrails.md), [ADR 0006](decisions/0006-agent-management-client.md), and [ADR 0010](decisions/0010-final-local-first-client.md).
- Task client tests validate `partialOutput`, and panel tests show live progress while active and prefer final `output` on completion; see [ADR 0003](decisions/0003-streaming-output-progress-client.md).
- Configuration client tests validate the Conchbase `0.5.0` v1/v2 document union kept by `0.7.0`, composition section shape, cross-check active/history ids, validation errors, apply, and rollback. Panel tests cover loading, unsupported capability, disconnected, validation, v2 apply/no-op, rollback, and keyboard states; see [ADR 0004](decisions/0004-versioned-configuration-client.md) and [ADR 0005](decisions/0005-composition-configuration-client.md).
- Guardrails verify Pagurus uses only the documented task, configuration, Agent, work-control, local Source, capability, and SecretHandle write routes and does not call Conchbase's tool request/approval routes.
- Repository guardrails verify task history remains a read-only consumer of `GET /v1/tasks`, contains no task write route or browser storage, and does not define a second task schema.
- Conchbase ADR 0021's paired-runtime acceptance dynamically imports these published clients and verifies the two-Agent loop, revision pins, stale writes, override/archive/default behavior, configuration apply/rollback, cancellation, restart interruption, retry, event replay, legacy `/v1/tasks`, CLI compatibility, v1/v2 dispatch, deterministic composition, streaming, invalid payloads, and unsupported-provider failure without fallback over live loopback HTTP. Bodyless cancel/retry POSTs do not declare a JSON content type.
- GitHub Actions runs `npm run check`, `npm test`, and `npm run build`.
- The paired final local-first `1.0.0` E2E walkthrough exercised the real Pagurus Vite `/v1` proxy against the real Conchbase development server and a temporary SQLite database. Its 54 deterministic HTTP requests covered published runtime capabilities, work controls and restart recovery, local Source policy, capability records, authenticated pairing metadata, and write-only SecretHandle create/rotate/status/use with digest-only receipts. Sentinel fixtures were absent from all proxied responses, durable events, logs, and database bytes. This validates the same-origin API client transport, not rendered UI screens, automated accessibility, real-provider conformance, production remote UX, or production-storage recovery.

This covers Agent management and task binding, read-only task history, revision comparison, legacy task compatibility, v1/v2 configuration revisions, version-2 work control and evidence, capability records, write-only SecretHandle one-shot submission, digest-only receipts, capability gating, sentinel no-leak fixtures, executable repository boundaries, deterministic local HTTP acceptance, and a completed manual/visual ADR 0007 screen walkthrough against a real local Runtime. Deterministic platform fixtures validate published versions, states, exact request bodies, capability-disabled controls, unsupported/loading/empty/offline states, one-shot input clearing, no browser storage, and absence of plaintext in rendered client state. The earlier visual walkthrough used a temporary database and the user's configured Magpie gateway; it verified mixed Agent/legacy records, server-pinned fields, success and provider-error output, state/Agent filters, explicit refresh, offline error/recovery, read-only revision comparison, Agent/configuration screens, and a 320px viewport. One selected model returned HTTP 429, providing a visible failure fixture. It does not validate visual composition editing, executable capability lifecycle workflows, portable files, server-side task pagination/filtering, SSE task events, tool approval UI, OS keychain custody, automated accessibility, or real-provider conformance because those features or validation layers remain separate work.

## Required validation layers as features arrive

1. **Unit:** API client parsing, connection-state transitions, configuration diff presentation, and error mapping.
2. **Component:** connected/offline/loading/error states, keyboard navigation, visible focus, labels, and disabled actions.
3. **Contract:** validate client types and fixtures against the OpenAPI contract in the Conchbase repository; include model override, optimistic conflict, history rollback, and legacy payload scenarios.
4. **Integration:** fake Runtime API with deterministic responses; no provider secrets and no public-network dependency.
5. **Visual/accessibility/manual:** narrow and wide viewport screenshots, reduced-motion preference, keyboard-only navigation, real-browser accessibility checks, and a complete screen walkthrough against a real local Conchbase runtime. ADR 0014's repository-level jsdom/CSS fixture is complete but narrower.
6. **Real-provider conformance:** live selected local provider fixtures that do not enter CI credentials and remain distinct from ADR 0021's deterministic fake gateway and Conchbase ADR 0028's compatibility fixture.
7. **Final work controls and SecretHandle no-leak:** sentinel fixtures prove no plaintext secret enters rendered DOM, component state serialization, browser storage, URLs, logs, errors, or client responses; control fixtures cover explicit authorization, denied, stopped, resumed, delivery-pending, capability-disabled, and offline states without inventing a second Runtime schema.

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
