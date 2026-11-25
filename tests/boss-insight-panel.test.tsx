// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BossInsightPanel } from '../src/agent/BossInsightPanel.js';
import type { AgentChatMessage } from '../src/shared/api/agent-chat.js';

function message(author: AgentChatMessage['author'], body: string, sequence: number): AgentChatMessage {
  return {
    id: `m${sequence}`, sequence, author, body, state: 'replied',
    taskId: null, error: null, phase: 'terminal', progress: null,
    updatedAt: '2026-11-26T00:00:00.000Z', replyToId: null, activity: [],
  };
}

afterEach(() => cleanup());

describe('Boss insight panel', () => {
  it('renders focus, attention, and recent reports in a semantic rail', () => {
    render(
      <BossInsightPanel messages={[
        message('user', '继续查第六个热搜', 1),
        message('runtime', '需要你补充搜索范围。', 2),
        message('runtime', '员工 热点检索员已完成。', 3),
      ]} />,
    );
    expect(screen.getByRole('complementary', { name: '指挥台' })).toBeTruthy();
    expect(screen.getByText('继续查第六个热搜')).toBeTruthy();
    expect(screen.getAllByText('需要你处理').length).toBeGreaterThan(0);
    expect(screen.getByText('员工 热点检索员已完成。')).toBeTruthy();
  });
});
