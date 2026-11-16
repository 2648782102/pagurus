# Decision 0041: A reading room, not a second instrument panel

Status: **accepted visual direction for the shipped Agent surface; no Runtime
API, route, client-schema, or console-visual changes**

Date: 2026-11-17 (Asia/Shanghai).

## Context

ADR 0040 gave the product its own shell, but the shell borrowed the console's
visual grammar: cool grey throughout, ruled rows, mono micro-labels in caps, and
the same compact rhythm. It worked, yet it read as a second diagnostic screen —
the one thing a person opening a chat product does not want to feel.

The console and the product are used for different jobs. An operator scans
state across ten work areas; a person reads one answer and writes one reply.
Sharing one visual language across both jobs meant the product inherited
density it did not need.

## Decision

The product gets its own token layer (`styles/agent-tokens.css`) and its own
voice, while keeping the console's brand marks: rust stays the primary action
and the wordmark stays "pagurus 寄居蟹".

**Colour.** A mineral paper ground (`#f3f4f1`), a deeper paper for raised
surfaces, and a tide-pool rail (`#1a2622`). Identity and focus use sea glass
(`#2f6b63`); status keeps the console's signal, amber, and danger hues so a
warning still means the same thing on both surfaces.

**Type.** Two faces with two jobs. Interface text — rail, labels, controls,
metadata — stays in the sans stack. The **answer body alone** is set in a
reading serif, because the answer is what the person came for. The serif stack
lists the Chinese face first: a Latin serif has no CJK glyphs, so putting it
first makes the browser substitute per character and mixes two fonts inside one
sentence.

**Layout.** One column at a 66-character measure. No cards. Section boundaries
are hairlines; the person's own message is a tinted block so it reads as a
different voice rather than a bordered panel. The rail is a rack of shells:
the agent is the crab, each conversation the shell it occupies.

**Restraint.** Rust appears once per screen (the new-conversation action). No
gradients, no shadows on content, no ALL-CAPS micro-labels, and no decorative
motion — only hover and focus feedback that answers an action.

## Options

### A. Keep the console's visual grammar for both

Consequences: one stylesheet, but the product keeps an operator's density and
never stops feeling like a diagnostic tool. Rejected.

### B. Adopt a generic chat look

Consequences: a warm cream ground with a clay accent, uniform rounded cards,
and a soft shadow on everything — the default treatment for this category, and
indistinguishable from any other assistant. Rejected.

### C. Same brand, different room

Consequences: a second token layer to maintain, but each surface is tuned to
its own job and both still read as Pagurus. Accepted.

## Validation

- `npm run check`, `npm test` (207 passing), and `npm run build`.
- `tests/architecture.test.ts` keeps each cascade layer under 300 lines; the
  product sheet was split into tokens, shell, entry, chat, and responsive
  layers rather than growing one file.
- `tests/interface-validation.test.tsx` asserts every layer is imported by
  `styles.css`, so a new layer cannot be silently orphaned.
- The console's own visual assertions are unchanged and still pass, confirming
  the product token layer does not leak into the operator surface.
- Manual loopback review at desktop width: rail, conversation, entry screen,
  and model popover.

## Consequences

A visual change to the product now has one obvious home. Anything both surfaces
share — the wordmark, the rust primary action, the status hues — is expressed
as a brand decision in both token layers rather than by importing console
styles, so the product cannot accidentally re-inherit instrument density.

This decision does not cover dark mode, a desktop wrapper, animation, or any
change to the console's appearance.
