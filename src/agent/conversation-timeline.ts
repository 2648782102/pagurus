/**
 * One ordered timeline for a conversation: messages, tool activity, approvals,
 * errors, and the user's own decisions.
 *
 * The thread already shows the conversation itself; this is the "what actually
 * happened, in order" view for the context rail. It only re-projects published
 * fields — it invents no events and reads no private state.
 */
import type { AgentChatActivity, AgentChatConversation, AgentChatMessage } from '../shared/api/agent-chat.js';

export type TimelineKind = 'user' | 'assistant' | 'tool' | 'approval' | 'error';

export interface TimelineEntry {
  readonly id: string;
  readonly kind: TimelineKind;
  readonly sequence: number;
  readonly label: string;
  readonly detail: string | null;
  readonly state: 'ok' | 'pending' | 'failed';
}

function activityKind(entry: AgentChatActivity): TimelineKind {
  if (entry.kind === 'approval') return 'approval';
  if (entry.kind === 'tool') return 'tool';
  return 'assistant';
}

function activityState(entry: AgentChatActivity): TimelineEntry['state'] {
  if (entry.state === 'failed') return 'failed';
  if (entry.state === 'waiting_approval' || entry.state === 'running') return 'pending';
  return 'ok';
}

function preview(body: string, max = 80): string {
  const line = body.replace(/\s+/g, ' ').trim();
  return line.length <= max ? line : `${line.slice(0, max)}…`;
}

function fromMessage(message: AgentChatMessage): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  // Messages are already on screen in the thread. The timeline records that a
  // turn happened — never the body again — so text does not appear twice and
  // the two views cannot drift.
  if (message.author === 'user') {
    entries.push({
      id: `msg-user-${message.id}`,
      kind: 'user',
      sequence: message.sequence,
      label: '你发了一条消息',
      detail: null,
      state: 'ok',
    });
    return entries;
  }
  if (message.body.trim().length > 0) {
    entries.push({
      id: `msg-assistant-${message.id}`,
      kind: 'assistant',
      sequence: message.sequence,
      label: 'Agent 作出回复',
      detail: null,
      state: message.state === 'failed' || message.state === 'unavailable' ? 'failed' : 'ok',
    });
  }
  for (const entry of message.activity) {
    entries.push({
      id: `act-${entry.id}`,
      kind: activityKind(entry),
      sequence: message.sequence,
      label: entry.label,
      detail: entry.detail,
      state: activityState(entry),
    });
  }
  if (message.error) {
    entries.push({
      id: `msg-error-${message.id}`,
      kind: 'error',
      sequence: message.sequence,
      label: '出错',
      detail: preview(message.error, 60),
      state: 'failed',
    });
  }
  return entries;
}

export function buildTimeline(conversation: AgentChatConversation | null): readonly TimelineEntry[] {
  if (conversation === null) return [];
  const seen = new Set<string>();
  const out: TimelineEntry[] = [];
  for (const message of conversation.messages) {
    for (const entry of fromMessage(message)) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      out.push(entry);
    }
  }
  // Within one message, the message itself precedes the activity it spawned.
  // Activity order stays as published: it is the Runtime's record of what
  // actually happened, not a UI-owned priority list.
  const kindRank: Record<TimelineKind, number> = { user: 0, assistant: 1, tool: 2, approval: 3, error: 4 };
  return Object.freeze([...out].sort((left, right) =>
    left.sequence - right.sequence
    || kindRank[left.kind] - kindRank[right.kind]
    || left.id.localeCompare(right.id)));
}

/** A short one-line summary for the section header. */
export function timelineSummary(entries: readonly TimelineEntry[]): string {
  const pending = entries.filter((entry) => entry.state === 'pending').length;
  const failed = entries.filter((entry) => entry.state === 'failed').length;
  const parts = [`${entries.length} 条`];
  if (pending > 0) parts.push(`${pending} 待处理`);
  if (failed > 0) parts.push(`${failed} 失败`);
  return parts.join(' · ');
}
