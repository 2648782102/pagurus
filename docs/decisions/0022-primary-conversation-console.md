# Decision 0022: Primary conversation console

Status: **accepted paired client contract for Conchbase primary conversation projection**

Date: 2026-11-14 (Asia/Shanghai).

## Context

Conchbase ADR 0045 publishes an additive `1.4.0` primary-conversation projection. Pagurus ADR 0018 connects the organization console to published organization state, but it still presents a single intent composer plus separate state cards. That is not a complete conversation experience: users cannot see their message, the Boss acknowledgement, employee activity, question, and report as one ordered thread.

Pagurus remains a client. It must not own Runtime state, invent a second transcript, compute authority, expose private model output, or turn internal events into a noisy chat log.

## Decision

1. Pagurus gates the primary-conversation panel on optional Runtime discovery `conversationContract: "1.4.0"` and `conversationPaths: 2`, while continuing to support organization-only `1.1.0` runtimes with the existing state console.
2. A typed client mirrors the exact `1.4.0` conversation and message-page response shapes. It does not derive authority locally or generate client types from an unaccepted schema.
3. The organization console gains a primary conversation surface with:
   - published user messages, Boss acknowledgements, worker activity, reports, Attention, and bounded system status;
   - message kind, author role, sequence, state, bounded body, and linked project/worker/report/attention ids;
   - cursor-based incremental refresh and a visible "syncing" state;
   - a composer that submits through the existing organization intent route and shows only local pending input until Runtime-published facts arrive;
   - inline answer/withdraw actions for open Attention messages using the Runtime-published `expectedVersion`;
   - existing project/delegation/worker/report/work-item cards retained as supporting detail.
4. The panel never renders raw model transcripts, prompts, private paths, plaintext secrets, arbitrary commands, local machine paths, or provider credentials. It never labels an interrupted worker or failed report as completed.
5. Stale cursor, stale expected version, unsupported Runtime, and load errors are visible bounded errors. Optimistic messages never appear as published Runtime facts.
6. Validation includes typed-client fixtures, message-page cursors, all message kinds and states, conversation panel rendering, unsupported Runtime fallback, attention decisions, keyboard focus, reduced motion, and narrow layouts. Both repositories must pass `npm run check`, `npm test`, and `npm run build`.

## Options

### A. Build a chat log entirely in browser state

Consequences: disappears on reload, diverges after Runtime restart, and makes the UI a competing source of truth. Rejected.

### B. Add a new client-side message authoring API

Consequences: invents a second Runtime contract without accepted durable semantics. Rejected.

### C. Render Runtime-published messages and keep existing organization facts as side detail

Consequences: preserves Runtime authority and makes the single primary conversation visible with bounded fixtures. Accepted.

## Consequences

Pagurus can now present the Boss-mode product as a complete primary conversation while remaining a read model client. Durable message authoring, file attachments, provider transcript streaming, and multi-session chat remain blocked.

> Paired client contract: this ADR covers only Conchbase ADR 0045's primary-conversation projection.
