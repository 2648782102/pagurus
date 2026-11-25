# Boss Agent 1080p layout design

## Intent

Pagurus' shipped Boss Agent surface currently shows a work card above the
conversation. That works in a narrow window but wastes a 1920×1080 desktop and
makes the transcript read as a secondary scroll. The product should instead
make one Boss conversation the place where the user talks, delegates, watches
work move, and sees what needs attention — without adding another chat entry.

The visual direction is modern, light, and lively: use Grok-style product
energy as a reference for confidence and state expression, but do not copy its
branding, exact composition, copy, or proprietary motion. Conchbase should
still look like Conchbase: a calm reading surface with one expressive,
Runtime-backed work system.

## Users and primary job

The user is talking to their personal Boss Agent on a desktop. The primary job
is: keep a continuous conversation with the Boss while delegated work advances
in the background; always know what is moving, what failed, and what needs the
user's attention.

## Goals

- Use the 1080p canvas with three clear regions: left work rail, center
  conversation, right context drawer.
- Keep one conversation entry. Work and context rails are not chat inputs.
- Show projects, workers, reports, failures, progress, and Attention from
  published Runtime organization facts; never parse Boss prose.
- Make state legible with motion: active work breathes, attention requests
  glow, completion settles, failure gets a brief shake or pulse.
- Support light and dark themes with the same information architecture.
- Respect reduced motion: text, icon, and position still convey all states.

## Non-goals

- No new provider integration or Runtime permission/product changes.
- No exact Grok clone, no copied assets or wording.
- No decorative animation that runs for its own sake.
- No new page or separate chat surface.
- No relying on CSS motion alone to communicate meaning.

## Layout contract

At 1280px and above:

```
+----------+--------------------------------+----------------+
| work     | conversation                   | context         |
| rail     | messages + composer            | drawer, closed  |
| 340-380  | flexible, max reading measure  | by default      |
+----------+--------------------------------+----------------+
```

- Chrome stays 52px: identity, thread title, connection, theme, diagnostics,
  console, history, context, new conversation.
- Left work rail is always present for Boss conversations. It contains:
  Attention first, active projects, worker states, recent reports.
- Center column owns the transcript, inline decisions, and the composer.
- Right context panel remains a toggleable rail. It contains pinned versions,
  capabilities, and activity metadata; it never owns orchestration state.

At 900–1279px the work rail becomes a narrower 280px rail; at below 900px it
returns to a compact collapsible strip above the transcript to preserve reading
width.

## Visual language

The current palette stays as the product's identity. The new work rail adds a
small "live state" vocabulary built from existing semantic tokens:

- active: sea-glass accent dot with slow breath;
- attention: amber/red orbit pulse and a clear text label;
- completed: green check with a short settle transition;
- failed: red dot with a short, non-repeating attention pulse;
- streaming/working: track sweep across the active project's rail.

All keyframes live in `motion-tokens.css`. Components only use named `anim-*`
classes. Looping cues remain slow and are disabled under reduced motion. No
new dependencies; motion is CSS-only.

## Interaction rules

- A project row can reveal its worker list; it never navigates away.
- Attention rows surface inside the work rail and in the transcript where the
  Runtime published the request; decisions stay in the chat thread.
- Worker failure details are bounded summaries, not raw logs.
- Project goals remain unverified unless the Runtime publishes a purpose; until
  then, display a humanized project id and keep the raw id secondary.
- Updating organization facts polls at the existing conservative interval and
  does not block or interrupt chat input.

## Approaches considered

1. **Stack work above chat.** Smallest change, but confirmed bad at desktop
   widths: the conversation becomes a lower scroll and delegation state steals
   the top of the page.
2. **Three-column desktop shell.** Best use of 1080p, clear ownership, works
   with the existing context rail, and gives motion a dedicated place in the
   work rail. More CSS and responsive work.
3. **Dark-only redesign.** Closest to a Grok-like feel, but would split the
   product's light and dark themes and increase visual QA work.

Chosen: approach 2 with dual-theme motion tokens. It meets the desktop goal
without abandoning the existing product identity.

## Builder latitude

- Exact rail width inside the stated range.
- Whether project rows are `<details>` or buttons, as long as they are keyboard
  accessible and do not add a chat entry.
- Which existing semantic token supplies each state accent, as long as both
  themes pass contrast and no state relies on color alone.

## Builder-check decisions

- Readable report, failure, Attention, and progress text comes from the
  Runtime-authored transcript notices already published in the Boss
  conversation. Published organization facts supply worker/report state. This
  stays a Pagurus-only change and does not require a Runtime contract change.
- Motion is bound to organization state: worker/report state from
  `/v1/organization/session`, and Runtime notice arrival from the conversation.
  It must never be driven by the Boss reply stream; a thinking Boss does not
  mean a delegated worker is running.
- At 900–1279px the context drawer overlays the right edge instead of taking a
  third grid column. The transcript keeps its width. At 1280px and above the
  context drawer is a real third column.

## Modern Web baseline

The shipped surface must not introduce legacy CSS, HTML, or JavaScript
patterns. In this change:

- use semantic native elements (`aside`, `section`, `article`, `ol`, `button`,
  `details`, `summary`) and native accessibility attributes such as `inert`;
- use modern CSS features already supported by the target browser: CSS grid,
  logical properties, `minmax()`, `clamp()`, `dvh`, `:has()`, `@layer`, native
  nesting, `color-mix()`, and `text-wrap` where they clarify the layout;
- use modern JavaScript/TypeScript syntax and standard APIs; no inline event
  handlers, no `document.write`, no presentational HTML attributes, no legacy
  CSS hacks, and no obsolete vendor-prefixed properties;
- add focused guardrail tests so deprecated patterns cannot creep back into the
  touched surface.

Builder latitude: choose which modern CSS features carry each part of the
layout, provided the result remains accessible and both themes are covered.

## Acceptance

- At 1920×1080, work rail, transcript, and context drawer are visibly separate
  without overlapping; the transcript remains the widest region.
- At 843px width (current in-app browser) and below 900px, the work rail stacks
  compactly and the transcript remains usable.
- Light and dark themes both render the work rail and its motion states.
- Reduced motion removes looping/state animation while preserving labels.
- Pagurus check, tests, and build pass.
