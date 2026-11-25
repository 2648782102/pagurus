import type { AgentChatMessage } from '../shared/api/agent-chat.js';

export interface BossInsightSignal {
  readonly id: string;
  readonly label: string;
  readonly state: 'attention' | 'failed' | 'success' | 'info';
  readonly body: string;
}

export interface BossInsightView {
  readonly focus: string | null;
  readonly turns: number;
  readonly attention: readonly BossInsightSignal[];
  readonly signals: readonly BossInsightSignal[];
}

function compact(body: string, max: number): string {
  const text = body
    .replace(/项目\s+project_[A-Za-z0-9_-]+[:：]?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function signal(message: AgentChatMessage): BossInsightSignal {
  const body = compact(message.body, 48);
  const state: BossInsightSignal['state'] = /Attention|需要你(?:补充|确认|输入)/i.test(body)
    ? 'attention'
    : /失败|受阻/.test(body) ? 'failed' : /完成|成功/.test(body) ? 'success' : 'info';
  const label = state === 'attention' ? '需要你' : state === 'failed' ? '结果异常'
    : state === 'success' ? '已完成' : 'Runtime';
  return { id: message.id, label, state, body };
}

/** Reads the user's current focus and Runtime-published signals from one Boss thread. */
export function buildBossInsightView(messages: readonly AgentChatMessage[]): BossInsightView {
  const users = messages.filter((message) => message.author === 'user' && message.body.trim().length > 0);
  const notices = messages
    .filter((message) => message.author === 'runtime' && message.body.trim().length > 0)
    .map(signal);
  return Object.freeze({
    focus: users.length > 0 ? compact(users[users.length - 1]!.body, 160) : null,
    turns: users.length,
    attention: notices.filter((item) => item.state === 'attention'),
    signals: notices.slice(-4).reverse(),
  });
}
