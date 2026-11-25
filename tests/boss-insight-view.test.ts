import { describe, expect, it } from 'vitest';
import { buildBossInsightView } from '../src/agent/boss-insight-view.js';
import type { AgentChatMessage } from '../src/shared/api/agent-chat.js';

function message(author: AgentChatMessage['author'], body: string, sequence: number): AgentChatMessage {
  return {
    id: `m${sequence}`, sequence, author, body, state: 'replied',
    taskId: null, error: null, phase: 'terminal', progress: null,
    updatedAt: '2026-11-26T00:00:00.000Z', replyToId: null, activity: [],
  };
}

describe('Boss insight view', () => {
  it('uses the latest user turn as the current focus', () => {
    const view = buildBossInsightView([
      message('user', '第一个目标', 1),
      message('user', '继续查第六个热搜', 2),
    ]);
    expect(view.focus).toBe('继续查第六个热搜');
    expect(view.turns).toBe(2);
  });

  it('classifies runtime notices without treating assistant replies as signals', () => {
    const view = buildBossInsightView([
      message('assistant', '已安排员工', 1),
      message('runtime', '员工 热点检索员已完成。', 2),
      message('runtime', '员工 GitHub 检索员失败。', 3),
      message('runtime', '需要你补充搜索范围。', 4),
    ]);
    expect(view.signals.map((item) => item.state)).toEqual(['attention', 'failed', 'success']);
    expect(view.attention).toHaveLength(1);
  });

  it('returns an empty focus and no signals for a fresh thread', () => {
    const view = buildBossInsightView([]);
    expect(view.focus).toBeNull();
    expect(view.signals).toEqual([]);
  });
});
