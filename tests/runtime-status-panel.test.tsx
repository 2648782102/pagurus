// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RuntimeStatusPanel } from '../src/features/runtime-status/RuntimeStatusPanel.js';
import { useRuntimeStatus } from '../src/features/runtime-status/useRuntimeStatus.js';
import { endpointHost, runtimeEndpointLabel } from '../src/shared/ui/runtime-endpoint.js';

function Harness() {
  const status = useRuntimeStatus();
  return <RuntimeStatusPanel
    state={status.state}
    health={status.health}
    runtime={status.runtime}
    error={status.error}
    refresh={status.refresh}
  />;
}

describe('RuntimeStatusPanel', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the checking state while the runtime request is pending', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    render(<Harness />);

    expect(screen.getByText('正在检查连接')).toBeTruthy();
    expect(screen.getByRole('button', { name: '检查中…' }).hasAttribute('disabled')).toBe(true);
  });

  it('formats any configured Runtime endpoint as a host label', () => {
    expect(endpointHost('http://127.0.0.1:4338')).toBe('127.0.0.1:4338');
    expect(endpointHost('https://runtime.example.test/')).toBe('runtime.example.test');
    expect(endpointHost('127.0.0.1:4318')).toBe('127.0.0.1:4318');
  });

  it('shows the configured Runtime endpoint instead of a hard-coded port', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    render(<Harness />);

    expect(screen.getByText(runtimeEndpointLabel())).toBeTruthy();
  });

  it('shows a connection error and allows the user to retry', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        name: 'Conchbase',
        version: '0.1.0',
        state: 'ready',
        capabilities: [],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: 'ok',
        service: 'conchbase',
        apiVersion: 1,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        name: 'Conchbase',
        version: '0.1.0',
        state: 'ready',
        capabilities: [],
      }), { status: 200 }));

    render(<Harness />);

    expect(await screen.findByText('运行时未连接')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Failed to fetch');

    fireEvent.click(screen.getByRole('button', { name: '重新连接' }));

    expect(await screen.findByText('运行时已连接')).toBeTruthy();
    expect(screen.getByText('v1')).toBeTruthy();
    expect(screen.getByText('0.1.0')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('shows an explicit incompatibility state for an unsupported API version', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const path = String(input);
      const payload = path.includes('health')
        ? { status: 'ok', service: 'conchbase', apiVersion: 2 }
        : {
          name: 'Conchbase',
          version: '0.1.0',
          state: 'ready',
          capabilities: [],
        };
      return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
    });

    render(<Harness />);

    expect(await screen.findByText('API 版本不兼容')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('需要 v1');
    expect(screen.getByRole('status').textContent).toContain('升级寄居蟹');
    expect(screen.getByRole('button', { name: '重新连接' }).hasAttribute('disabled')).toBe(false);
  });

  it('renders the restricted execution mode and the published loop budget', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const path = String(input);
      const payload = path.includes('health')
        ? { status: 'ok', service: 'conchbase', apiVersion: 1 }
        : {
          name: 'Conchbase',
          version: '1.0.0',
          state: 'ready',
          capabilities: ['execution-modes'],
          executionMode: 'restricted',
          loopBudget: { maxIterations: 6, maxToolCallsPerTurn: 4, deadlineMs: 120_000 },
        };
      return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
    });

    render(<Harness />);

    expect(await screen.findByText('限制模式（写操作与外部操作需审批）')).toBeTruthy();
    expect(screen.getByText('6 轮 · 每轮 4 次工具 · 120 秒')).toBeTruthy();
    expect(screen.queryByText('完全放开模式已启用')).toBeNull();
  });

  it('warns that unrestricted mode executes tools without approval', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const path = String(input);
      const payload = path.includes('health')
        ? { status: 'ok', service: 'conchbase', apiVersion: 1 }
        : {
          name: 'Conchbase',
          version: '1.0.0',
          state: 'ready',
          capabilities: ['execution-modes'],
          executionMode: 'unrestricted',
          loopBudget: { maxIterations: 24, maxToolCallsPerTurn: 8, deadlineMs: 600_000 },
        };
      return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
    });

    render(<Harness />);

    expect(await screen.findByText('完全放开（工具不经审批直接执行）')).toBeTruthy();
    expect(screen.getByText('完全放开模式已启用')).toBeTruthy();
    expect(screen.getByText(/不会停下来等你确认/)).toBeTruthy();
    expect(screen.getByText('24 轮 · 每轮 8 次工具 · 600 秒')).toBeTruthy();
  });
});
