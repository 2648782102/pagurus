// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CapabilityPanel } from '../src/features/capabilities/CapabilityPanel.js';

const runtime = {
  name: 'Conchbase' as const,
  version: '1.0.0',
  state: 'ready' as const,
  capabilities: ['capability-directory'],
};

const capability = {
  version: 2 as const, id: 'cap_fixture', kind: 'mcp' as const, name: 'fixture',
  status: 'enabled' as const, descriptor: 'local descriptor', createdAt: '2026-11-11T00:00:00.000Z',
};
function json(payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status: 200 });
}

describe('CapabilityPanel', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('reads records and submits one bounded capability upsert', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ version: 2, capabilities: [capability] }))
      .mockResolvedValueOnce(json({ version: 2, capability }))
      .mockResolvedValueOnce(json({ version: 2, capabilities: [capability] }));
    render(<CapabilityPanel runtime={runtime} />);
    expect(await screen.findByText(/mcp · fixture/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: 'fixture' } });
    fireEvent.change(screen.getByLabelText('描述'), { target: { value: 'local descriptor' } });
    fireEvent.click(screen.getByRole('button', { name: '保存能力记录' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([path, init]) =>
      path === '/v1/capabilities' && init?.method === 'POST')).toBe(true));
    expect(await screen.findByText('能力记录已保存')).toBeTruthy();
    expect((screen.getByLabelText('名称') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('描述') as HTMLInputElement).value).toBe('');
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/localStorage|sessionStorage|indexedDB|secretValue|plaintext/i);
  });

  it('shows an offline error state', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<CapabilityPanel runtime={runtime} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('keeps the editor closed without the capability-directory capability', async () => {
    render(<CapabilityPanel runtime={{ ...runtime, capabilities: [] }} />);
    expect(await screen.findByText(/能力目录保持关闭状态/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '保存能力记录' })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
