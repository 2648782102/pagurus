# Decision 0035: Display published close-out reports as sections

Status: **accepted client presentation boundary; no Runtime API or client-schema changes**

Date: 2026-11-16 (Asia/Shanghai).

## Context

Conchbase ADR 0082 writes a structured project close-out report at convergence:
a headline, outcomes, open issues, and next steps. The Runtime renders that
document into bounded text and publishes it as an ordinary assistant message in
the Boss conversation. The public organization contract does not yet expose the
structured document itself, so a client cannot read the four fields directly.

The console should still make the published report readable. Treating it as one
undifferentiated paragraph hides the difference between what was achieved and
what is still open, which is the reason the report exists.

## Decision

1. Pagurus renders the published close-out text as sections when it matches the
   Runtime's rendered shape: a headline beginning with `项目 `, followed by the
   known section labels `成果：`, `遗留问题：`, and `如需继续：` with dash-prefixed
   items.
2. Rendering uses only the published message body. It does not call a model,
   read private state, reconstruct a missing document, or create a second
   project-summary schema.
3. Any body that does not match the shape remains an ordinary message. Detection
   is conservative so a normal Boss reply is never reclassified as a report.
4. The display is presentational only. Runtime authority, message ordering,
   authorship, persistence, and the Agent Chat contract are unchanged.
5. When the organization contract later exposes the structured document, this
   formatter should be replaced by typed rendering rather than kept as a
   parallel parser.

## Options

### A. Leave the report as one paragraph

Consequences: zero parsing, but the report is hard to scan and its open issues
and next steps are visually lost. Rejected.

### B. Read the private `organization_project_summaries` table

Consequences: violates the client boundary and creates a second source of truth.
Rejected.

### C. Conservatively format the already-published text

Consequences: no contract change, no private access, and the report becomes
scannable while the public read model remains an explicit follow-up. Accepted.

## Validation

- `tests/agent-chat-panel.test.tsx` covers section headings, headline, and list
  items for a published close-out report.
- Existing Agent Chat message, pending, approval, and stream tests remain
  unchanged.
- `npm run check`, `npm test`, and `npm run build` pass.

## Consequences

The report reads as a small structured document inside the conversation without
changing the Runtime contract. Exposing the structured document remains a
separate organization-contract decision.
