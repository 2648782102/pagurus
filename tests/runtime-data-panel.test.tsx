// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuntimeDataPanel } from '../src/features/runtime-status/RuntimeDataPanel.js';

const runtime = {
  name: 'Conchbase' as const,
  version: '1.0.0',
  state: 'ready' as const,
  capabilities: [],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('Runtime data panel', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('reports the database location and the redacted checks', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/operations/data') {
        return Promise.resolve(json({
          version: 1, databasePath: '/tmp/runtime.sqlite', sizeBytes: 2048, schemaVersion: 9, exists: true,
        }));
      }
      if (path === '/v1/operations/diagnostics') {
        return Promise.resolve(json({
          version: 1,
          checks: [
            { id: 'node', status: 'ok', detail: 'Node 24.22.2' },
            { id: 'database', status: 'warn', detail: 'database is large' },
          ],
        }));
      }
      return Promise.resolve(json({}, 404));
    }));

    render(<RuntimeDataPanel runtime={runtime} />);

    expect(await screen.findByText('/tmp/runtime.sqlite')).toBeTruthy();
    expect(screen.getByText('2.0 KB')).toBeTruthy();
    const list = screen.getByRole('list', { name: '环境检查' });
    expect(list.children.length).toBe(2);
    expect(screen.getByText('database is large')).toBeTruthy();
  });

  it('degrades to unsupported when an older Runtime has no such route', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(json({ error: 'not found' }, 404))));

    render(<RuntimeDataPanel runtime={runtime} />);

    expect(await screen.findByText(/未发布/)).toBeTruthy();
    expect(screen.queryByText(/读取运行时数据失败/)).toBeNull();
  });

  it('shows the failure instead of an empty panel when the read breaks', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(json({ error: 'boom' }, 500))));

    render(<RuntimeDataPanel runtime={runtime} />);

    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('renders the runtime-port check verbatim instead of second-guessing it', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/operations/data') {
        return Promise.resolve(json({
          version: 1, databasePath: '/tmp/runtime.sqlite', sizeBytes: 10, schemaVersion: 9, exists: true,
        }));
      }
      if (path === '/v1/operations/diagnostics') {
        return Promise.resolve(json({
          version: 1,
          checks: [{ id: 'runtime-port', status: 'ok', detail: '127.0.0.1:4372 is this Runtime.' }],
        }));
      }
      return Promise.resolve(json({}, 404));
    }));
    render(<RuntimeDataPanel runtime={runtime} />);
    expect(await screen.findByText('127.0.0.1:4372 is this Runtime.')).toBeTruthy();
  });

  it('backs up to a chosen path and reports integrity', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === '/v1/operations/data') {
        return Promise.resolve(json({ version: 1, databasePath: '/tmp/runtime.sqlite', sizeBytes: 10, schemaVersion: 9, exists: true }));
      }
      if (path === '/v1/operations/diagnostics') {
        return Promise.resolve(json({ version: 1, checks: [] }));
      }
      if (path === '/v1/operations/backup' && init?.method === 'POST') {
        return Promise.resolve(json({
          version: 1, ok: true, target: '/tmp/snap.sqlite', sizeBytes: 4096,
          tables: ['tasks'], counts: { tasks: 1 }, integrity: 'ok',
        }, 201));
      }
      return Promise.resolve(json({}, 404));
    }));
    render(<RuntimeDataPanel runtime={runtime as never} />);
    await waitFor(() => expect(screen.getByLabelText('备份目标绝对路径')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('备份目标绝对路径'), { target: { value: '/tmp/snap.sqlite' } });
    fireEvent.click(screen.getByRole('button', { name: '备份' }));
    await waitFor(() => expect(screen.getByText(/已备份到 \/tmp\/snap\.sqlite/)).toBeTruthy());
  });

  it('requires a path before backing up', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/operations/data') {
        return Promise.resolve(json({ version: 1, databasePath: '/tmp/runtime.sqlite', sizeBytes: 10, schemaVersion: 9, exists: true }));
      }
      return Promise.resolve(json({ version: 1, checks: [] }));
    }));
    render(<RuntimeDataPanel runtime={runtime as never} />);
    await waitFor(() => expect(screen.getByRole('button', { name: '备份' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '备份' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('绝对路径'));
  });

  it('generates and copies a support bundle', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/operations/data') {
        return Promise.resolve(json({ version: 1, databasePath: '/tmp/runtime.sqlite', sizeBytes: 10, schemaVersion: 9, exists: true }));
      }
      if (path === '/v1/operations/diagnostics') {
        return Promise.resolve(json({ version: 1, checks: [] }));
      }
      if (path === '/v1/operations/support-bundle') {
        return Promise.resolve(json({ version: 1, bundle: {
          format: 'conchbase-support-bundle', generatedAt: '2026-11-20T00:00:00.000Z', version: '1.0.0',
          data: { databasePath: '/tmp/runtime.sqlite', sizeBytes: 10, schemaVersion: 9 },
          runtime: { host: '127.0.0.1', port: 4318, magpieBaseUrl: 'http://127.0.0.1:3425' },
          checks: [{ id: 'node', status: 'ok', detail: 'fine' }],
          summary: { status: 'ok', nextStep: null },
        } }));
      }
      return Promise.resolve(json({}, 404));
    }));
    render(<RuntimeDataPanel runtime={runtime as never} />);
    await waitFor(() => expect(screen.getByRole('button', { name: '生成支持包' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '生成支持包' }));
    await waitFor(() => expect(screen.getByLabelText('支持包内容')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '复制' }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(String(writeText.mock.calls[0]?.[0])).toContain('Conchbase support bundle');
  });
});
