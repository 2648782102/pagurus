# Decision 0038: One Runtime transport, shared payload guards

Status: **accepted client architecture boundary; no Runtime API, route, or
client-schema changes**

Date: 2026-11-16 (Asia/Shanghai).

## Context

ADR 0036 split the console by domain and put a 500-line ceiling on every
TypeScript module. The feature layers were then small, but the `shared/api`
layer had grown eight parallel copies of the same HTTP mechanics:
`runtime.ts`, `agents.ts`, `tasks.ts`, `configuration.ts`, `work.ts`,
`organization.ts`, `execution.ts`, and `execution-runs.ts` each built their own
`fetch` call, their own `Accept` header, their own JSON body rule, their own
abort wiring, and their own status-to-message mapping.

That duplication had already caused drift. `tasks.ts` and `configuration.ts`
omitted `Content-Type` on bodyless POSTs; `execution.ts` used a lowercase
`content-type` key; `configuration.ts` parsed an error body on every failure
while `runtime.ts` parsed none; and English and Chinese error copy for the same
status code differed between modules. The guards repeated too: `isRecord`
appeared in twelve files, `isBoundedString` in three, `isStringArray` in four,
and `isVersioned` in four, with subtly different definitions (some rejected
arrays, some did not; some trimmed, some did not).

The problem was therefore not the framework. React 19, TypeScript, and Vite are
adequate for a console of this size; there is no evidence that a router, a
server-state cache, or a component library would have prevented any of these
defects. The problem was that a real reuse boundary had appeared and had not
been named.

## Decision

1. **One transport module.** `src/shared/api/http.ts` owns `fetch`, header
   composition, JSON body encoding, abort wiring, error-body reading, and
   fallback HTTP errors. It exports `requestJson` for validated payloads and the
   read-only `fetchJson` for probes that must never parse an error body.
2. **Domain modules keep their language.** Each API module keeps its published
   routes, its payload validators, and its user-facing status copy. It passes an
   `httpError(status, payload)` mapper and an `invalidPayload(path)` factory to
   the transport. This preserves per-domain messages and the
   `ConfigurationValidationError` detail path without a shared error taxonomy.
3. **Facades keep their names.** `requestWorkJson`, `requestJson` in
   `organization.ts`, and the local `request` helpers remain exported with their
   current signatures so no caller, test, or paired Runtime acceptance changes.
4. **Bodyless POST stays bodyless.** `Content-Type` is derived from an actual
   body. Cancel/retry must send no `Content-Type`, matching
   `tests/task-api.test.ts` and the paired Runtime acceptance.
5. **One guards module.** `src/shared/api/guards.ts` owns the primitive
   predicates: `isRecord`, bounded/non-empty/plain strings, string arrays,
   nullable string/integer, `hasOnlyKeys`, and versioned records. Domain
   validators stay in their modules because they encode contract semantics.
6. **Guardrails assert intent, not incidental source text.** The transport
   guardrail requires that `runtime.ts` exposes only the two read routes, never
   declares a write method, and routes through the shared transport. The
   bodyless-POST guardrail requires the same behaviour it always did, checked
   where the behaviour now lives plus the existing API test that proves it.

## Options

### A. Leave the eight copies in place

Consequences: every new endpoint repeats the drift above, and each fix has to
be applied eight times. Rejected.

### B. Adopt a data-fetching framework to centralise requests

Consequences: a new dependency, a second cache of Runtime state, and the same
per-domain error mapping would still be needed. The repository guardrails
forbid this class of dependency. Rejected.

### C. One small transport plus shared primitive guards

Consequences: no dependency, no route or schema change, one place for wire
rules, and domain language preserved. Accepted.

## Validation

- `npm run check`, `npm test`, and `npm run build`.
- The existing per-domain API tests continue to assert each published route,
  request body, status message, and malformed-payload rejection.
- `tests/architecture.test.ts` still enforces the 500-line ceiling and the
  app → features → shared direction.
- `tests/repository-guardrails.test.ts` continues to reject any write method in
  `runtime.ts`, any invented configuration or work route, and any browser
  storage or private-file access.

## Consequences

Adding a typed client now means: add the route and its validator, choose the
domain error mapping, and delegate to `requestJson`. A future attempt to put
credentials, a second schema, or a private-file read into the transport fails
the same guardrails as before. This decision does not accept a router, a
state library, generated client types, or any new Runtime behaviour.
