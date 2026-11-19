// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentChatComposer } from '../src/features/agent-chat/AgentChatComposer.js';

describe('composer keyboard path', () => {
  afterEach(cleanup);

  it('keeps Send in the tab order while the draft is empty', () => {
    // A disabled button disappears from the tab order, so a keyboard user who
    // just typed could not reach Send without shift-tabbing backwards.
    render(<AgentChatComposer draft="" busy={false} waiting={false} onDraftChange={vi.fn()} onSend={vi.fn()} />);
    const send = screen.getByRole('button', { name: '发送消息' }) as HTMLButtonElement;
    expect(send.disabled).toBe(false);
    expect(send.getAttribute('aria-disabled')).toBe('true');
  });

  it('still refuses to send an empty draft, and sends once there is text', () => {
    const onSend = vi.fn();
    const { rerender } = render(
      <AgentChatComposer draft="" busy={false} waiting={false} onDraftChange={vi.fn()} onSend={onSend} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    expect(onSend).not.toHaveBeenCalled();

    rerender(<AgentChatComposer draft="你好" busy={false} waiting={false} onDraftChange={vi.fn()} onSend={onSend} />);
    const send = screen.getByRole('button', { name: '发送消息' }) as HTMLButtonElement;
    expect(send.getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(send);
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});
