# Decision 0034: A shared UI primitive layer and restrained at-a-glance hierarchy

Status: **accepted client presentation boundary; no Runtime API or client-schema changes**

Date: 2026-11-16 (Asia/Shanghai).

## Context

The console had grown by adding one panel at a time. Each panel carried its own
button, field, notice, status, and card CSS. The result was functional but hard
to scan: the overview repeated the navigation, every surface competed at the same
visual weight, task history rendered unbounded rows, and small controls drifted
in height, focus treatment, and disabled styling.

The open DeepSeek Harness research prototype (`dsh-superagent-prototype`, MIT)
offers a useful reference at the level of information architecture: prioritize
work that needs a person, keep healthy states quiet, use row lists instead of
uniform card grids, and fold identifiers into secondary details. Its front end is
a host plugin that depends on DeepSeek Harness client packages and tokens; it is
not a drop-in component library for this console. No source, branding, copy, or
host package was copied.

## Decision

1. Pagurus owns a small presentation primitive layer in
   `src/shared/ui/primitives.tsx`: `Button`, `IconButton`, `Field`, `TextInput`,
   `Textarea`, `Select`, `Tag`, `StatusDot`, `Section`, `Disclosure`,
   `EmptyState`, and `Notice`. It has no Runtime imports and no new dependency.
2. Primitives own the shared visual and accessibility behavior: native button
   types, disabled state, field-label association, focus visibility, status
   tones, and semantic notice roles. Feature panels compose them instead of
   re-creating comparable controls.
3. Information hierarchy is restrained: one section title per region, healthy
   states stay compact, identifiers move into rows or details, and error/warning
   notices are visible only when they carry an action or a real state change.
4. The overview answers "where do I go next" with Runtime status, three quick
   starts, and a grouped workspace directory. It does not duplicate every
   navigation item as a full-height row.
5. Agent Chat keeps its accepted landing flow (ADR 0033). Conversation history
   is bounded and scrollable, and the landing list refreshes on a low-frequency
   visibility-gated timer so a Runtime-authored notice appears even when the user
   has not sent a message. An opened conversation uses its accepted SSE stream.
6. Responsive behavior is based on the container where possible. The overview
   switches to one column before the Runtime card becomes unreadably narrow.
7. Dense operational surfaces (task history, work items, execution evidence)
   keep a bounded scroll region and preserve their existing listbox and detail
   semantics.

## Options

### A. Keep per-panel controls and only restyle the overview

Consequences: the first screen improves, but forms, notices, and statuses keep
drifting apart and each new panel repeats the same accessibility work. Rejected.

### B. Copy the DSH prototype's front end

Consequences: it depends on a different host's private packages and tokens, and
its Source/Trigger/Eval vocabulary would replace Pagurus's Agent/task model.
Rejected.

### C. A dependency-free primitive layer plus restrained hierarchy

Consequences: shared behavior is explicit and local, the Runtime boundary is
unchanged, and additional component libraries remain optional later. Accepted.

## Validation

- `tests/ui-primitives.test.tsx` covers control variants, field association,
  status tone with a text alternative, disclosure behavior, empty state, and
  explicit notice roles.
- Existing panel tests continue to cover connection, task, Agent, configuration,
  work, capability, SecretHandle, execution, organization, and Agent Chat flows.
- `tests/agent-chat-landing.test.tsx` covers a landing-list refresh without a
  user message.
- `npm run check`, `npm test`, and `npm run build` pass.

## Consequences

The console is easier to scan without changing its authority model, Runtime
paths, schemas, or security boundary. New panels should compose the shared
primitives. A richer component library such as Radix or assistant-ui remains a
separate decision; it must not be introduced only to reproduce behavior that the
primitive layer already owns.
