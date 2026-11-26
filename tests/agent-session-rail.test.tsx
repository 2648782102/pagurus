// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentSessionRail } from '../src/agent/AgentSessionRail.js';

afterEach(() => cleanup());

const conversations = [{
  id: 'chat_a', agentId: 'boss-agent', reasoningEffort: null,
  createdAt: '2026-11-26T00:00:00.000Z', messageCount: 4, lastMessagePreview: '帮我看一下发布状态',
}, {
  id: 'chat_b', agentId: 'boss-agent', reasoningEffort: null,
  createdAt: '2026-11-25T00:00:00.000Z', messageCount: 2, lastMessagePreview: '整理资料',
}] as never;

describe('Agent session rail', () => {
  it('groups conversations and marks the open one', () => {
    render(
      <AgentSessionRail conversations={conversations} activeConversationId="chat_a"
        onNewThread={() => undefined} onResume={() => undefined} />,
    );
    const rail = screen.getByRole('complementary', { name: '会话' });
    expect(within(rail).getByRole('navigation', { name: '会话记录' })).toBeTruthy();
    expect(within(rail).getByRole('button', { name: /帮我看一下发布状态/ })).toBeTruthy();
    expect(within(rail).queryByText(/\n/)).toBeNull();
    expect(within(rail).getByRole('button', { name: /帮我看一下发布状态/ }).getAttribute('aria-current')).toBe('page');
  });

  it('starts a thread and resumes an existing one', () => {
    const onNewThread = vi.fn();
    const onResume = vi.fn();
    render(
      <AgentSessionRail conversations={conversations} activeConversationId={null}
        onNewThread={onNewThread} onResume={onResume} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /新对话/ }));
    fireEvent.click(screen.getByRole('button', { name: /整理资料/ }));
    expect(onNewThread).toHaveBeenCalledTimes(1);
    expect(onResume).toHaveBeenCalledWith('chat_b');
  });
});
