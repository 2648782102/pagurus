# Decision 0026: Agent Chat conversation states console

Status: **accepted paired client contract for Conchbase Agent Chat states**

Date: 2026-11-14 (Asia/Shanghai).

## Context

Conchbase ADR 0048 extends the frozen `1.5.0` Agent Chat message model with an explicit conversation state vocabulary and bounded progress fields. Pagurus ADR 0025 already provides a continuous setup-to-chat flow, but its message renderer only understands `published / pending / succeeded / failed / cancelled` and shows a single generic waiting label.

## Decision

1. Pagurus mirrors the expanded Conchbase `1.5.0` message schema. It does not add a new Runtime route or second state schema.
2. The continuous thread renders explicit, accessible states:
   - `thinking`: waiting indicator and "正在思考…";
   - `streaming`: partial body plus streaming caret and progress;
   - `organizing`: organization indicator and "正在组织工作…";
   - `waiting_attention`: "等待你的确认" plus the Runtime-published body;
   - `replied`: normal assistant message;
   - `failed` / `unavailable` / `cancelled`: bounded error text and a retry affordance where applicable.
3. The composer shows send/waiting state and remains focused after submit. Polling continues while any assistant message is nonterminal.
4. Pagurus never exposes raw chain-of-thought, local optimistic assistant text, browser-stored transcripts, private paths, or SecretHandle plaintext.
5. Unsupported Runtime, load/submit/poll errors, empty states, and narrow layouts remain explicit and accessible.
6. Validation covers typed-client parsing of all new fields, panel rendering of thinking/streaming/organizing/waiting-attention/replied/failed/unavailable/cancelled states, Enter/Shift+Enter behavior, and unsupported Runtime fallback. Both repositories must pass `npm run check`, `npm test`, and `npm run build`.

## Options

### A. Translate all new Runtime states into `pending` in the client

Consequences: loses the user-visible state model and hides failures. Rejected.

### B. Generate local assistant state from timers

Consequences: competes with Runtime-published truth and breaks replay. Rejected.

### C. Render the Runtime state vocabulary directly in the conversation

Consequences: visible thinking/reply/error lifecycle with one source of truth. Accepted.

## Consequences

Pagurus now shows a complete Agent conversation lifecycle while Conchbase remains the only execution and publication authority.

> Paired client contract: this ADR covers only Conchbase ADR 0048's additive `1.5.0` message state model.
