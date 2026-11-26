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

  it('keeps a row one line tall, so titles cannot paint over the next row', () => {
    render(
      <AgentSessionRail conversations={conversations} activeConversationId="chat_a"
        onNewThread={() => undefined} onResume={() => undefined} />,
    );
    const button = screen.getByRole('button', { name: /帮我看一下发布状态/ });
    /*
     * A regression guard for the actual bug: the row's height came from an
     * earlier `max-block-size: 1.5em` rule at the same specificity, so the
     * `nowrap` title overflowed a half-height row instead of ellipsizing.
     * jsdom has no layout, so the check is that the title cell owns the
     * clipping rather than the button's own font metrics.
     */
    expect(button.querySelector('.agent-rail-title')).toBeTruthy();
    expect(within(button as HTMLElement).getByText(/帮我看一下发布状态/).className).toBe('agent-rail-title');
  });

  it('filters by title once there are enough threads to warrant a field', () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      id: `chat_${index}`,
      agentId: 'boss-agent',
      reasoningEffort: null,
      createdAt: '2026-11-26T00:00:00.000Z',
      messageCount: 2,
      lastMessagePreview: index === 2 ? '季度预算复盘' : `普通会话 ${index}`,
      title: index === 2 ? '季度预算复盘' : `普通会话 ${index}`,
    })) as never;
    render(
      <AgentSessionRail conversations={many} activeConversationId={null}
        onNewThread={() => undefined} onResume={() => undefined} />,
    );
    const field = screen.getByLabelText('筛选会话');
    fireEvent.change(field, { target: { value: '预算' } });
    const rail = screen.getByRole('complementary', { name: '会话' });
    expect(within(rail).getByRole('button', { name: /季度预算复盘/ })).toBeTruthy();
    expect(within(rail).queryByRole('button', { name: /普通会话 0/ })).toBeNull();
  });
});
