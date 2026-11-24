// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FirstRunGuide } from '../src/agent/FirstRunGuide.js';

const agent = { id: 'agt_a', name: '老板 Agent' } as never;
const model = { reference: 'magpie:m1', displayName: 'M1' } as never;

function renderGuide(overrides: Partial<React.ComponentProps<typeof FirstRunGuide>> = {}) {
  const props = {
    connection: 'connected' as const,
    agents: [agent],
    models: [model],
    dismissed: false,
    onDismiss: vi.fn(),
    onUseExample: vi.fn(),
    onOpenDiagnostics: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<FirstRunGuide {...props} />) };
}

afterEach(cleanup);

describe('FirstRunGuide', () => {
  it('renders nothing once dismissed', () => {
    const { container } = renderGuide({ dismissed: true });
    expect(container.firstChild).toBeNull();
  });

  it('shows the real state of each precondition, not a blanket "all good"', () => {
    renderGuide({ connection: 'disconnected', models: [] });
    expect(screen.getByText('没有连上；先启动 Conchbase，再点右上角重新连接')).toBeTruthy();
    expect(screen.getByText('Runtime 没有返回模型；到控制台的运行时状态页检查 provider')).toBeTruthy();
  });

  it('offers an example only when every step is ready', () => {
    const notReady = renderGuide({ models: [] });
    expect(screen.queryByRole('button', { name: '用这条开始' })).toBeNull();
    notReady.unmount();

    renderGuide();
    expect(screen.getByRole('button', { name: '用这条开始' })).toBeTruthy();
  });

  it('uses the example text and reports dismissal', () => {
    const { props } = renderGuide();
    fireEvent.click(screen.getByRole('button', { name: '用这条开始' }));
    expect(props.onUseExample).toHaveBeenCalledWith(expect.stringContaining('你能做什么'));
    fireEvent.click(screen.getByRole('button', { name: '关闭使用引导' }));
    expect(props.onDismiss).toHaveBeenCalled();
  });

  it('points at the console when no agent exists', () => {
    renderGuide({ agents: [] });
    expect(screen.getByText('还没有可用 Agent；可以先在控制台创建一个')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '用这条开始' })).toBeNull();
  });

  it('offers a direct diagnostics action when setup is blocked', () => {
    const props = { onOpenDiagnostics: vi.fn() };
    renderGuide({ connection: 'disconnected', models: [], ...props });
    fireEvent.click(screen.getByRole('button', { name: '查看诊断' }));
    expect(props.onOpenDiagnostics).toHaveBeenCalled();
  });
});
