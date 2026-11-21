import type { AgentChatPermissionLevel } from '../../shared/api/agent-chat.js';

/**
 * How a conversation's approval level is chosen in the composer.
 *
 * The Runtime pins a level per conversation and clamps a request to its own: a
 * conversation can be stricter, never looser (`narrowPermissionLevel` in the
 * kernel). The client must not offer a choice the Runtime would silently change,
 * because a reader who picks "完全放开" on a `standard` Runtime and sees nothing
 * change has no way to tell whether approval is off.
 */

const STRICTNESS: Readonly<Record<AgentChatPermissionLevel, number>> = Object.freeze({
  trusted: 0,
  standard: 1,
  strict: 2,
});

const LABELS: Readonly<Record<AgentChatPermissionLevel, string>> = Object.freeze({
  strict: '最严格 · 每步都确认',
  standard: '标准 · 写操作确认',
  trusted: '完全放开 · 不打断',
});

/** Every level, most restrictive first. */
const ALL: readonly AgentChatPermissionLevel[] = Object.freeze(['strict', 'standard', 'trusted']);

export interface PermissionOption {
  readonly value: AgentChatPermissionLevel;
  readonly label: string;
}

/**
 * The levels this Runtime allows, most restrictive first.
 *
 * `null` means the Runtime did not publish a level — an older build. In that
 * case only `standard` is offered, because that is what such a Runtime used.
 */
export function permissionOptionsFor(
  runtimeLevel: AgentChatPermissionLevel | null,
): readonly PermissionOption[] {
  const ceiling = runtimeLevel === null ? 'standard' : runtimeLevel;
  return Object.freeze(ALL
    .filter((level) => STRICTNESS[level] >= STRICTNESS[ceiling])
    .map((level) => Object.freeze({ value: level, label: LABELS[level] })));
}

/** The level a new conversation should default to: the Runtime's own. */
export function defaultPermissionLevel(
  runtimeLevel: AgentChatPermissionLevel | null,
): AgentChatPermissionLevel {
  return runtimeLevel ?? 'standard';
}

/** Whether the control is worth rendering: one option cannot be chosen. */
export function hasPermissionChoice(options: readonly PermissionOption[]): boolean {
  return options.length > 1;
}
