/**
 * Composer trigger policy for Pagurus, on top of DSH's detection core.
 *
 * The detection itself is DSH's own (`src/dsh/trigger/detect.ts`, with its
 * shared `@file` grammar) rather than a lookalike: it is the code that decides
 * that `https://…` contains no slash command, that `user@host` is an address
 * and not a file reference, and that `@"a path with spaces` is one token.
 *
 * What stays here is the product policy DSH cannot own: which characters this
 * surface offers at all, and what each trigger means to Pagurus.
 */
import {
  detectTrigger,
  type TriggerGuard,
} from '../../dsh/trigger/detect.js';
import { formatFileMention } from '../../dsh/trigger/file-reference-grammar.js';

export type ComposerTrigger =
  | {
    readonly kind: 'command';
    /** Text after the slash, lowercased. Empty right after typing `/`. */
    readonly query: string;
    /** Index of the `/` itself. */
    readonly start: number;
  }
  | {
    readonly kind: 'file';
    readonly query: string;
    /** True for an open `@"…` token, which may contain spaces. */
    readonly quoted: boolean;
    readonly start: number;
  };

/**
 * A trigger only exists where the surface advertises it.
 *
 * DSH separates the guard *tier* (whether a trigger is suppressed by an
 * enclosing claim) from availability. Pagurus has no claims, so the tier is
 * always `plain`, and a trigger the product does not offer is simply not
 * consulted — a menu that opens onto nothing is worse than no menu.
 */
export function composerTriggerAt(
  draft: string,
  caret: number,
  options: { readonly commands: boolean; readonly files: boolean },
): ComposerTrigger | null {
  if (!options.commands && !options.files) return null;
  const guard: TriggerGuard = { tier: 'plain' };
  const hit = detectTrigger(draft, caret, guard);
  if (hit === null) return null;
  if (hit.trigger === '/') {
    if (!options.commands) return null;
    return { kind: 'command', query: hit.query.toLowerCase(), start: hit.span.start };
  }
  if (!options.files) return null;
  return { kind: 'file', query: hit.query, quoted: hit.quoted, start: hit.span.start };
}

/**
 * Replaces the trigger token with the chosen text and reports the new caret.
 *
 * The replacement is built with DSH's own `formatFileMention`, so a path with a
 * space is inserted as `@"a path"` and a directory keeps its quote open — the
 * same rules the rest of DSH's input layer reads back.
 */
export function applyTriggerChoice(
  draft: string,
  trigger: ComposerTrigger,
  replacement: string,
  options: { readonly quoted?: boolean } = {},
): { readonly draft: string; readonly caret: number } {
  const tail = draft.slice(trigger.start);
  /*
   * A quoted token runs to its closing quote (or the end of the draft), so the
   * whole `@"…` is replaced rather than only up to the first space.
   */
  const consumed = trigger.kind === 'file' && (trigger.quoted || options.quoted)
    ? (/^@"[^"]*"?/.exec(tail)?.[0] ?? /^\S*/.exec(tail)?.[0] ?? '')
    : /^\S*/.exec(tail)?.[0] ?? '';
  const head = draft.slice(0, trigger.start);
  const next = `${head}${replacement}${tail.slice(consumed.length)}`;
  return { draft: next, caret: head.length + replacement.length };
}

/** The insertion value for one workspace file, via DSH's mention grammar. */
export function fileMention(path: string): string {
  return formatFileMention({ path, kind: 'file' }, false) ?? `@${path}`;
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
