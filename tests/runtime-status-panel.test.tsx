// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RuntimeStatusPanel } from '../src/features/runtime-status/RuntimeStatusPanel.js';

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

    render(<RuntimeStatusPanel />);

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

    render(<RuntimeStatusPanel />);

    expect(await screen.findByText('运行时未连接')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Failed to fetch');

    fireEvent.click(screen.getByRole('button', { name: '重新连接' }));

    expect(await screen.findByText('运行时已连接')).toBeTruthy();
    expect(screen.getByText('v1')).toBeTruthy();
    expect(screen.getByText('0.1.0')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
