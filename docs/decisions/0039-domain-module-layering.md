# Decision 0039: Each API domain splits into contract, client, and selectors

Status: **accepted client architecture boundary; no Runtime API, route, or
client-schema changes**

Date: 2026-11-16 (Asia/Shanghai).

## Context

ADR 0038 removed the duplicated transport. That left three `shared/api`
modules holding four concerns each:

- `organization.ts` (420 lines) declared the versioned records, validated
  payloads, performed HTTP, and also projected one session into attention,
  report, delegation, proposal, and work-item views.
- `work.ts` (322 lines) did the same for the version-2 durable-work domain.
- `configuration.ts` (321 lines) mixed the v1/v2 document union with the two
  accepted writes.

The projections were the sharpest problem. `listOrganizationAttentionFrom`
looks like a read but performs no request: it sorts a payload the caller already
holds. Keeping it beside `getOrganizationSession` invited a caller to treat a
local ordering rule as published authority, and it made the transport module the
only place a presentation tweak could be tested.

## Decision

Each domain that outgrew one reviewable unit now has up to three modules behind
its existing entry point:

1. **`<domain>-contract.ts`** — versioned records, the published path list, the
   constants, and the payload validators. Import from `guards.js` only; no
   transport and no `RuntimeInfo`.
2. **`<domain>-client.ts`** — typed reads and the accepted writes. It delegates
   to `http.ts` and imports validators from the contract module.
3. **`<domain>-selectors.ts`** — pure projections of a payload the Runtime
   already returned. No request, no state, no mutation of published identity.
4. **`<domain>.ts`** — remains as the single documented import path and
   re-exports the pieces. Every existing import site and signature is unchanged.

`work.ts` follows a slightly different split because its guardrail requires the
`requestWorkJson` helper and every accepted route to remain in that file:
`work-contract.ts` holds records and constants, `work-validators.ts` holds the
unchanged version-2 validators, and `work.ts` keeps the helper plus routes.

`platform.ts` was not one domain at all. It held three sub-domains with
different authority and different risk: bounded capability records, the local
Source event ledger, and write-only SecretHandles. Those are now
`capabilities.ts`, `local-source.ts`, and `secret-handles.ts`, re-exported from
`platform.ts`. A SecretHandle change can no longer touch a capability write.

Validators moved by copying the existing functions, not by rewriting them. Field
names, required revisions, and list-versus-detail differences are contract facts;
a refactor must not silently relax them.

## Options

### A. Leave the modules and rely on review

Consequences: the projection-versus-request confusion remains, and one file
keeps four reasons to change. Rejected.

### B. Split every domain mechanically, including small ones

Consequences: `runtime.ts` (127 lines, two reads) would gain three files for no
reader benefit. The repository rules already reject pre-created layers. Rejected.

### C. Split only domains that outgrew a unit, behind an unchanged facade

Consequences: no caller changes, no contract change, smaller units where the
pressure is real. Accepted.

## Validation

- `npm run check`, `npm test`, and `npm run build`.
- Every existing per-domain API test asserts the same routes, bodies, status
  messages, and malformed-payload rejections through the unchanged facade.
- New pure-function tests cover event merging, selection fallbacks, attention
  ordering, the 24-event display cap, and live-versus-derived work items.
- `tests/repository-guardrails.test.ts` now asserts work and organization facts
  across their domain modules rather than one file's incidental layout, and
  still rejects any invented route, Trigger write, browser storage, or private
  file access.
- `tests/architecture.test.ts` still enforces the 500-line ceiling and the
  app → features → shared direction.

## Consequences

A change now has one obvious home: wire rules in `http.ts`, payload shape in the
contract module, requests in the client, display ordering in selectors, and
orchestration in the feature hook. `organization.ts`, `work.ts`, and
`configuration.ts` stay the documented entry points, so documentation and
cross-repository acceptance keep pointing at stable paths.
