# Validation plan

This document records current automated coverage and the next validation layers needed as console features arrive.

## Current automated coverage

- Runtime API client tests validate health/runtime response shapes, malformed payloads, and HTTP error handling.
- Component tests cover the checking, disconnected, retry, and connected states.
- Component tests cover the unsupported-API-version recovery state and assert planned workspaces are non-interactive.
- GitHub Actions runs `npm run check`, `npm test`, and `npm run build`.

This is a scaffold-level baseline. It does not validate configuration workflows, task events, approvals, or secret handling because those features do not exist yet.

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
