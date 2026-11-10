// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RuntimeStatusPanel } from '../src/features/runtime-status/RuntimeStatusPanel.js';
import { useRuntimeStatus } from '../src/features/runtime-status/useRuntimeStatus.js';

function Harness() {
  const status = useRuntimeStatus();
  return <RuntimeStatusPanel {...status} />;
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
});
