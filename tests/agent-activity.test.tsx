// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentChatThread } from '../src/features/agent-chat/AgentChatThread.js';

function message(activity: unknown[]) {
  return {
    id: 'amsg_alpha',
    sequence: 2,
    author: 'assistant' as const,
    body: '已写入文件。',
    state: 'replied' as const,
    taskId: 'task_alpha',
    error: null,
    phase: 'terminal' as const,
    progress: null,
    updatedAt: '2026-11-19T00:00:00.000Z',
    replyToId: null,
    activity,
  } as never;
}

describe('Agent activity list', () => {
  afterEach(cleanup);

  it('renders each step with its state, so a reader can see what actually ran', () => {
    render(
      <AgentChatThread
        messages={[message([
          { id: 'a1', kind: 'turn', label: '第 1 轮', state: 'running', detail: null },
          { id: 'a2', kind: 'tool', label: '读取文件', state: 'succeeded', detail: 'read_file' },
          { id: 'a3', kind: 'tool', label: '写入文件', state: 'failed', detail: 'workspace_write' },
        ])]}
        agentName="研究助手"
        busy={false}
        onDecision={vi.fn()}
      />,
    );

    // A settled turn folds its steps into one disclosure, DSH-style.
    expect(screen.getByRole('button', { name: /3 个步骤/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /3 个步骤/ }));

    const list = screen.getByRole('list', { name: 'Agent 执行活动' });
    expect(list.children.length).toBe(3);
    /*
     * State must be visible in the DOM, not only implied by colour. The rows are
     * DSH's own `StateDot`, which publishes the semantic state as `data-state`
     * rather than as a class of ours.
     */
    expect(list.querySelector('li[data-state="running"]')).toBeTruthy();
    expect(list.querySelector('li[data-state="succeeded"]')).toBeTruthy();
    expect(list.querySelector('li[data-state="failed"]')).toBeTruthy();
    expect(screen.getByText('read_file')).toBeTruthy();
  });
});
