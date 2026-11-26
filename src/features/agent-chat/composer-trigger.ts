/**
 * What the composer is offering, given the text before the caret.
 *
 * Two triggers, one shape:
 *
 * - `/` at the start of a word offers commands — things the client itself can
 *   do, like starting a new thread or opening the context panel.
 * - `@` at the start of a word offers workspace files — a way to name a path
 *   precisely instead of describing it, which is the difference between "read
 *   my notes" and "read docs/notes/2026-11.md".
 *
 * Both are recognised only at a word boundary, so a URL's `@` or a fraction
 * like `1/2` does not open a popup nobody asked for. The helper is pure so the
 * keyboard rules can be tested without a DOM.
 */

export type ComposerTrigger = {
  readonly kind: 'command';
  /** Text after the slash, lowercased. Empty right after typing `/`. */
  readonly query: string;
  /** Index of the `/` itself. */
  readonly start: number;
};

export type ComposerFileTrigger = {
  readonly kind: 'file';
  readonly query: string;
  readonly start: number;
};

export type ComposerTriggerResult = ComposerTrigger | ComposerFileTrigger;

/** A trigger is only a trigger at the start of a word. */
function atWordBoundary(draft: string, index: number): boolean {
  if (index === 0) return true;
  return /\s/.test(draft[index - 1] ?? '');
}

export function composerTriggerAt(draft: string, caret: number): ComposerTriggerResult | null {
  const upto = draft.slice(0, Math.max(0, Math.min(caret, draft.length)));
  /*
   * The token being typed: no whitespace ends it, and the marker must be the
   * first character of the token. A file reference may span directories, so
   * the `@` branch accepts slashes inside the query; `//` is not a command, so
   * the `/` branch still stops at one.
   */
  const match = /(^|\s)([/@])([^\s]*)$/.exec(upto);
  if (!match) return null;
  const marker = match[2] as '/' | '@';
  const query = match[3] ?? '';
  // A command token never contains a slash: `1/2` and `//` are not commands.
  if (marker === '/' && query.includes('/')) return null;
  const start = upto.length - query.length - 1;
  if (!atWordBoundary(upto, start)) return null;
  /*
   * A file mention may contain a slash — `@docs/plans/x.md` is the whole point
   * — but a command never does, so `//` and an absolute path do not look like
   * a command menu. A space still ends both.
   */
  return marker === '/'
    ? { kind: 'command', query: query.toLowerCase(), start }
    : { kind: 'file', query, start };
}

/** Replaces the trigger token with the chosen text and puts the caret after it. */
export function applyTriggerChoice(
  draft: string,
  trigger: ComposerTriggerResult,
  replacement: string,
): { readonly draft: string; readonly caret: number } {
  const head = draft.slice(0, trigger.start);
  const tail = draft.slice(trigger.start);
  const consumed = /^\S*/.exec(tail)?.[0] ?? '';
  const next = `${head}${replacement}${tail.slice(consumed.length)}`;
  return { draft: next, caret: head.length + replacement.length };
}

export interface ComposerCommand {
  readonly id: string;
  readonly title: string;
  /** One line, shown under the title: what the command actually does. */
  readonly hint: string;
  readonly keywords?: readonly string[];
}

export function filterCommands(
  commands: readonly ComposerCommand[],
  query: string,
): readonly ComposerCommand[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return commands;
  return commands.filter((command) =>
    command.id.toLowerCase().includes(needle)
    || command.title.toLowerCase().includes(needle)
    || (command.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(needle)));
}
