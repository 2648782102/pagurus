import type { AgentChatAgent, AgentChatModel } from '../shared/api/agent-chat.js';

/**
 * Presentation helpers for the product surface.
 *
 * Shells in this class of product share a handful of small behaviours that are
 * pure functions: grouping a session rail by day, rendering a relative time, and
 * naming what a model can do. Keeping them here makes them testable without
 * mounting a component, and keeps the components about layout.
 */

export type RailGroupKey = 'today' | 'yesterday' | 'week' | 'earlier';

export const RAIL_GROUP_LABELS: Readonly<Record<RailGroupKey, string>> = Object.freeze({
  today: '今天',
  yesterday: '昨天',
  week: '近 7 天',
  earlier: '更早',
});

const DAY_MS = 86_400_000;

/** Groups by calendar day in the viewer's timezone, not by raw elapsed hours. */
export function railGroupOf(createdAt: string, now: Date = new Date()): RailGroupKey {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 'earlier';
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfCreated = new Date(
    created.getFullYear(), created.getMonth(), created.getDate(),
  ).getTime();
  const days = Math.round((startOfToday - startOfCreated) / DAY_MS);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return 'week';
  return 'earlier';
}

export interface RailGroup<T> {
  readonly key: RailGroupKey;
  readonly label: string;
  readonly items: readonly T[];
}

/** Preserves input order inside each group and omits empty groups. */
export function groupForRail<T extends { readonly createdAt: string }>(
  items: readonly T[],
  now: Date = new Date(),
): readonly RailGroup<T>[] {
  const buckets: Record<RailGroupKey, T[]> = { today: [], yesterday: [], week: [], earlier: [] };
  for (const item of items) buckets[railGroupOf(item.createdAt, now)].push(item);
  return (Object.keys(buckets) as RailGroupKey[])
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({ key, label: RAIL_GROUP_LABELS[key], items: buckets[key] }));
}

export function shortRelativeTime(createdAt: string, now: Date = new Date()): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '';
  const elapsedMs = now.getTime() - created.getTime();
  // Below a minute, report seconds of freshness rather than claiming "1 分钟".
  if (elapsedMs < 60_000) return '刚刚';
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return `${Math.floor(days / 30)} 个月前`;
}

/**
 * A model entry from the published catalog, labelled for a chooser.
 *
 * The provider stays visible because it is a real fact the user may need, but
 * it is secondary: the display name is what identifies the choice.
 */
export function modelOption(model: AgentChatModel): { value: string; label: string; provider: string } {
  return { value: model.reference, label: model.displayName, provider: model.providerId };
}

export function agentSubtitle(agent: AgentChatAgent | undefined): string {
  if (!agent) return '未选择 Agent';
  return `${agent.providerId}:${agent.modelId}`;
}

/** A conversation title that reads like a user's, not like an id. */
export function conversationTitle(preview: string, messageCount: number): string {
  const trimmed = preview.trim();
  if (trimmed.length > 0) return trimmed;
  return messageCount === 0 ? '（空会话）' : '（无标题对话）';
}
