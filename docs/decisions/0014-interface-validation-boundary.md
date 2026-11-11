# Decision 0014: Executable client interface validation boundary

Status: **accepted repository development boundary; no client or Runtime API contract changes**

Date: 2026-11-12 (Asia/Shanghai).

## Context

Pagurus `PROJECT_STATUS.json` lists two directly executable `ready` slices: automated accessibility validation and published-contract validation. Existing component tests cover some labels, navigation, and response validation, but there is no named fixture that checks keyboard focus, reduced-motion CSS, narrow/wide responsive rules, and all published typed-client routes against Conchbase's 47-path OpenAPI as a group.

Conchbase [ADR 0028](https://github.com/2648782102/conchbase/blob/main/docs/decisions/0028-interface-validation-boundary.md) accepts the paired Runtime-side provider compatibility fixture. Pagurus must close its two slices without adding a browser-automation dependency, reading private Runtime files, generating a second schema, storing client state, or changing a published route.

## Options

### A. Add Playwright or axe to CI

Consequences: richer real-browser checks, but adds an unaccepted dependency and a browser installation boundary. Rejected.

### B. Point the fixture at a remote OpenAPI URL

Consequences: no local file access, but CI becomes network-dependent and could validate a moving `main` branch instead of the checked-out paired Runtime contract. Rejected.

### C. Add deterministic jsdom/CSS/source fixtures over the paired local checkout

Consequences: keyboard focus, visible focus rules, reduced-motion behavior, responsive breakpoints, published path/method coverage, and fixture-envelope alignment become executable with current dependencies. The local OpenAPI path is read only by a Vitest Node-side fixture, never by browser source. Accepted.

## Decision

1. `tests/interface-validation.test.tsx` is an executable accessibility fixture. It verifies skip-link focus, keyboard navigation between all seven workspace links, active-page state, visible focus CSS, reduced-motion CSS, and narrow/wide responsive CSS boundaries. It uses jsdom and the existing CSS source; it does not claim a full WCAG audit or real-browser rendering.
2. `tests/published-contract.test.ts` is an executable contract fixture. It parses the paired Conchbase `docs/openapi.yaml` when the sibling Runtime checkout is present and checks every Pagurus typed-client path, method, and fixture response envelope against the published 47-path contract. It skips the OpenAPI-dependent assertions only when that optional checkout is absent, while still checking Pagurus's local route inventory.
3. `docs/PROJECT_STATUS.json` records both fixtures in `validationEvidence` with `executableFixture: true` and removes the two corresponding `ready` slices. `nextBoundedSlices` remains empty until a future accepted ADR defines a new bounded slice.
4. `docs/AI_HANDOFF.md`, `docs/OBJECTIVE_MODE.zh-CN.md`, `docs/AI_DEVELOPMENT.md`, `docs/VALIDATION_PLAN.md`, both README files, and `tests/repository-guardrails.test.ts` are updated in the same slice. `v1.0.0` release notes and assets remain immutable.
5. Conchbase remains the Runtime API source of truth. No generated client type, second schema, route, write, capability gate, browser storage, plaintext SecretHandle path, or dependency is introduced.

## Validation

- `npm run check`, `npm test`, and `npm run build`.
- Guardrails assert ADR 0014, executable fixture records, the new test files, and that no stale `ready` validation slice remains.
- The local OpenAPI read uses a repository-relative path and is absent from `src/`; browser storage and credentials remain absent.

## Consequences

A later coding model sees both client validation slices as closed executable evidence. The fixture is intentionally narrower than a real-browser accessibility audit or a generated-client contract: it checks repository-owned accessibility rules and published route alignment without creating a competing source of truth.

> Development boundary only: this ADR does not add a UI feature, public contract, release, or deferred product capability.
