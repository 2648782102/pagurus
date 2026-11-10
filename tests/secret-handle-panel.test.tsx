// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SecretHandlePanel } from '../src/features/secrets/SecretHandlePanel.js';

const runtime = {
  name: 'Conchbase' as const,
  version: '1.0.0',
  state: 'ready' as const,
  capabilities: ['write-only-secret-handles'],
};

const FIXED_SECRET = 'fixture-secret-never-logged';
const digest = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const handle = {
  version: 2 as const, id: 'sh_fixture', key: 'fixture-key', secretVersion: 1,
  status: 'active' as const, purpose: 'fixture purpose', allowedAdapter: 'local-bound-fixture',
  destinationBinding: 'local-fixture', valueDigest: digest,
  createdAt: '2026-11-11T00:00:00.000Z', rotatedAt: null,
};
const receipt = {
  version: 2 as const, id: 'sur_fixture', handleId: handle.id, secretVersionDigest: digest,
  grantRevision: 'grant_fixture', adapterId: 'local-bound-fixture', destinationDigest: digest,
  outcome: 'injected' as const, workItemId: 'work_fixture', assignmentId: 'asg_fixture',
  createdAt: '2026-11-11T00:00:00.000Z',
};
function json(payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status: 200 });
}

describe('SecretHandlePanel', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('submits a one-shot value, clears it, and renders only digest-only metadata', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ version: 2, handles: [handle] }))
      .mockResolvedValueOnce(json({ version: 2, receipts: [receipt] }))
      .mockResolvedValueOnce(json({ version: 2, handle }))
      .mockResolvedValueOnce(json({ version: 2, handles: [handle] }))
      .mockResolvedValueOnce(json({ version: 2, receipts: [receipt] }));
    render(<SecretHandlePanel runtime={runtime} />);
    expect(await screen.findByText(/fixture-key · v1/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'fixture-key' } });
    fireEvent.change(screen.getByLabelText(/只写 value/), { target: { value: FIXED_SECRET } });
    fireEvent.change(screen.getByLabelText('用途'), { target: { value: 'fixture purpose' } });
    fireEvent.click(screen.getByRole('button', { name: '一次性提交' }));
    await waitFor(() => expect((screen.getByLabelText(/只写 value/) as HTMLInputElement).value).toBe(''));
    await waitFor(() => expect(fetchMock.mock.calls.some(([path, init]) =>
      path === '/v1/secret-handles' && init?.method === 'POST')).toBe(true));
    const createCall = fetchMock.mock.calls.find(([path, init]) =>
      path === '/v1/secret-handles' && init?.method === 'POST');
    expect(createCall?.[1]?.body).toContain(FIXED_SECRET);
    expect(document.body.textContent).not.toContain(FIXED_SECRET);
    expect(screen.getAllByText(digest).length).toBeGreaterThan(0);
    expect(screen.getByText('injected')).toBeTruthy();
    expect(document.body.innerHTML).toContain('type="password"');
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/localStorage|sessionStorage|indexedDB|decrypt|resolveSecret/i);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('rotates, disables, and invokes the fixed adapter through published routes', async () => {
    fetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        if (path.endsWith('/rotate')) return Promise.resolve(json({ version: 2, handle: { ...handle, secretVersion: 2 } }));
        if (path.endsWith('/status')) return Promise.resolve(json({ version: 2, handle: { ...handle, status: 'disabled' } }));
        if (path.endsWith('/use')) return Promise.resolve(json({ version: 2, receipt }));
      }
      if (path === '/v1/secret-handles') return Promise.resolve(json({ version: 2, handles: [handle] }));
      if (path === '/v1/secret-handles/use-receipts') return Promise.resolve(json({ version: 2, receipts: [receipt] }));
      return Promise.resolve(json({ version: 2, handles: [] }));
    });
    render(<SecretHandlePanel runtime={runtime} />);
    expect(await screen.findByRole('button', { name: '轮换' })).toBeTruthy();
    const rotation = screen.getByLabelText('轮换 fixture-key 的值') as HTMLInputElement;
    fireEvent.change(rotation, { target: { value: 'rotated-value' } });
    fireEvent.click(screen.getByRole('button', { name: '轮换' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([path]) => path.endsWith('/rotate'))).toBe(true));
    expect((screen.getByLabelText('轮换 fixture-key 的值') as HTMLInputElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: '禁用' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([path]) => path.endsWith('/status'))).toBe(true));
    fireEvent.change(screen.getByLabelText('WorkItem id'), { target: { value: 'work_fixture' } });
    fireEvent.change(screen.getByLabelText('Assignment id'), { target: { value: 'asg_fixture' } });
    fireEvent.change(screen.getByLabelText('Grant revision'), { target: { value: 'grant_fixture' } });
    fireEvent.click(screen.getByRole('button', { name: '使用 fixture-key' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([path]) => path.endsWith('/use'))).toBe(true));
    expect(document.body.textContent).not.toContain('rotated-value');
  });

  it('shows an offline error state', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<SecretHandlePanel runtime={runtime} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('keeps the one-shot editor closed without the write-only capability', async () => {
    render(<SecretHandlePanel runtime={{ ...runtime, capabilities: [] }} />);
    expect(await screen.findByText(/句柄编辑器保持关闭状态/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '一次性提交' })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
