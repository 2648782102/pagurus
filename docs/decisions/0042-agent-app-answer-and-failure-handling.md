# Decision 0042: Readable answers, honest failures, and a way back

Status: **accepted client behaviour for the shipped Agent surface; no Runtime
API, route, or client-schema changes**

Date: 2026-11-17 (Asia/Shanghai).

## Context

The product shell was structurally right, but it behaved like a demo: every
answer was one pre-wrapped string, transport errors surfaced as
`Runtime returned HTTP 503`, an IME commit could send a half-typed sentence, and
a long thread had no way back to the newest turn.

Each of those was found by using the surface against a real model, not by
reading the code. They are the difference between a shell that renders and a
product someone can rely on.

## Decision

1. **Render structure the answer already has.** The Runtime publishes an answer
   as one string, but a real reply contains fenced code, lists, headings, and
   quotes. `agent-answer-format.ts` recognises exactly those constructs and
   falls back to plain text for anything else; `AgentAnswer.tsx` renders them as
   React text, so an answer cannot inject markup. A single paragraph is still a
   single paragraph.
2. **Parse the shapes models actually emit.** In practice a model often returns
   the whole answer on one line, with ```` ```bash ```` and `1. … 2. …` inline.
   The parser therefore breaks before a fence or a list marker that follows
   sentence punctuation or an introducing colon, lifts a closing sentence out of
   the last item, and leaves version numbers like `1.2` and dashes inside a
   sentence untouched.
3. **Never send mid-composition.** A Chinese or Japanese IME fires Enter to
   commit a candidate; sending then truncates the sentence. Both composers now
   ignore Enter while `isComposing` is set or the legacy `keyCode` is `229`.
4. **Translate failures into what to do next.** `agent-error-text.ts` maps
   status codes to plain guidance (unavailable, rate limited, gone, unauthorized,
   offline) and keeps an unknown status visible rather than silent. The console
   keeps its technical wording, which is correct for an operator.
5. **Give long threads a way back.** The thread reports whether the reader is
   still at the newest turn; when they are not, one control appears to jump
   there. It never competes with the composer during normal reading.
6. **Do not lose the draft.** A failed send leaves the composed text in place;
   only a successful send clears it.

## Options

### A. Introduce a Markdown renderer and a sanitizer

Consequences: a new dependency, an HTML injection surface, and behaviour for
constructs the Runtime never publishes. Rejected: the published text is plain,
so a small lossless parser covers it without a sanitizer.

### B. Show the raw error so nothing is hidden

Consequences: technically honest, useless to a reader. Rejected for the product
surface; kept in the console.

### C. Small parser, plain-language failures, explicit controls

Consequences: a few hundred lines of testable pure functions and no dependency.
Accepted.

## Validation

- `npm run check`, `npm test` (237 passing), and `npm run build`.
- `tests/agent-answer-format.test.ts` covers prose, fenced code (including
  mid-line and unterminated), ordered and bullet lists, inline numbering,
  version numbers, quotes, headings, and CRLF input.
- `tests/agent-error-text.test.ts` covers each status mapping plus a non-Error
  value and an already-human domain message.
- `tests/agent-app.test.tsx` asserts that an IME commit does not send while a
  plain Enter does.
- Verified against the live runtime: a reply published on one line now renders
  as paragraph → three-item ordered list → closing paragraph, with a language-
  tagged code block.

## Consequences

Formatting lives in one pure module the console does not use, so the operator
surface keeps its exact previous rendering. Any future answer construct needs a
parser case and a test before it appears in the product. This decision does not
accept Markdown, HTML, images, or executable content in answers.
