// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentToolActivity } from '../src/features/agent-chat/AgentToolActivity.js';

afterEach(() => cleanup());

const entries = [
  { id: 'a1', kind: 'tool', label: '调用工具 http_fetch', state: 'succeeded', detail: 'top.baidu.com' },
  { id: 'a2', kind: 'approval', label: '审批已处理', state: 'succeeded', detail: 'external' },
  { id: 'a3', kind: 'turn', label: '第 2 轮', state: 'succeeded', detail: null },
] as never;

describe('Agent tool activity', () => {
  it('collapses a settled turn into one line with its tool count', () => {
    render(<AgentToolActivity entries={entries} turnState="replied" />);
    const toggle = screen.getByRole('button', { name: /3 个步骤/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('list', { name: 'Agent 执行活动' })).toBeNull();
  });

  it('expands to DSH-style rows with tool name, state and detail', () => {
    render(<AgentToolActivity entries={entries} turnState="replied" />);
    fireEvent.click(screen.getByRole('button', { name: /3 个步骤/ }));
    const list = screen.getByRole('list', { name: 'Agent 执行活动' });
    expect(within(list).getByText('调用工具 http_fetch')).toBeTruthy();
    expect(within(list).getByText('top.baidu.com')).toBeTruthy();
    expect(list.querySelectorAll('li.is-succeeded')).toHaveLength(3);
  });

  it('stays open while the turn is still running', () => {
    render(<AgentToolActivity entries={entries} turnState="thinking" />);
    expect(screen.getByRole('list', { name: 'Agent 执行活动' })).toBeTruthy();
  });

  it('marks failed steps and says why', () => {
    render(<AgentToolActivity
      entries={[{ id: 'f1', kind: 'tool', label: '调用工具 web_extract', state: 'failed', detail: 'timeout' }] as never}
      turnState="replied" />);
    fireEvent.click(screen.getByRole('button', { name: /1 个步骤/ }));
    const row = screen.getByText('调用工具 web_extract').closest('li');
    expect(row?.className).toContain('is-failed');
    expect(row?.textContent).toContain('timeout');
  });

  it('renders nothing when the turn has no activity', () => {
    const { container } = render(<AgentToolActivity entries={[]} turnState="replied" />);
    expect(container.firstChild).toBeNull();
  });
});
