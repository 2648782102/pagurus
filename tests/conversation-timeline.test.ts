import { describe, expect, it } from 'vitest';
import { buildTimeline, timelineSummary } from '../src/agent/conversation-timeline.js';
import type { AgentChatConversation, AgentChatMessage } from '../src/shared/api/agent-chat.js';

function message(overrides: Partial<AgentChatMessage> & Pick<AgentChatMessage, 'id' | 'sequence' | 'author'>): AgentChatMessage {
  return {
    body: '', state: 'replied', taskId: null, error: null, phase: 'terminal',
    progress: null, updatedAt: '', replyToId: null, activity: [],
    ...overrides,
  } as AgentChatMessage;
}

function conversation(messages: readonly AgentChatMessage[]): AgentChatConversation {
  return { messages } as AgentChatConversation;
}

describe('conversation timeline', () => {
  it('orders user message, tool call, approval, and reply by sequence', () => {
    const conv = conversation([
      message({ id: 'm1', sequence: 1, author: 'user', body: '帮我写文件' }),
      message({
        id: 'm2', sequence: 2, author: 'assistant', body: '好的，我来写。',
        activity: [
          { id: 'a1', kind: 'tool', label: '写入文件', state: 'succeeded', detail: 'a.txt' },
          { id: 'a2', kind: 'approval', label: '等待审批：workspace_write → a.txt', state: 'waiting_approval', detail: '风险：write' },
        ] as never,
      }),
    ]);
    const timeline = buildTimeline(conv);
    expect(timeline.map((entry) => entry.kind)).toEqual(['user', 'assistant', 'tool', 'approval']);
    expect(timeline[3]?.state).toBe('pending');
    expect(timeline[3]?.label).toContain('workspace_write');
  });

  it('surfaces an error entry and marks it failed', () => {
    const conv = conversation([
      message({ id: 'm1', sequence: 1, author: 'assistant', body: '', state: 'failed', error: '模型超时' }),
    ]);
    const timeline = buildTimeline(conv);
    expect(timeline.some((entry) => entry.kind === 'error' && entry.state === 'failed')).toBe(true);
  });

  it('deduplicates the same activity id across messages', () => {
    const shared = { id: 'dup', kind: 'tool', label: '重复项', state: 'succeeded', detail: null };
    const conv = conversation([
      message({ id: 'm1', sequence: 1, author: 'assistant', body: 'a', activity: [shared] as never }),
      message({ id: 'm2', sequence: 2, author: 'assistant', body: 'b', activity: [shared] as never }),
    ]);
    expect(buildTimeline(conv).filter((entry) => entry.label === '重复项')).toHaveLength(1);
  });

  it('summarizes counts, pending, and failures', () => {
    const conv = conversation([
      message({ id: 'm1', sequence: 1, author: 'user', body: 'hi' }),
      message({
        id: 'm2', sequence: 2, author: 'assistant', body: 'x', state: 'failed', error: 'boom',
        activity: [{ id: 'a', kind: 'approval', label: 'x', state: 'waiting_approval', detail: null }] as never,
      }),
    ]);
    const summary = timelineSummary(buildTimeline(conv));
    expect(summary).toContain('待处理');
    expect(summary).toContain('失败');
  });

  it('returns an empty timeline for no conversation', () => {
    expect(buildTimeline(null)).toEqual([]);
  });
});
