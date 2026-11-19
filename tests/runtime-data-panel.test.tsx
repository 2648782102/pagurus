// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
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

  it('reads the self-port warning as "listening", not as a conflict to fix', async () => {
    // The Runtime probes the socket it is already bound to, so a healthy
    // instance reports "already in use". Showing that as a warning would train
    // people to ignore the diagnostics.
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/operations/data') {
        return Promise.resolve(json({
          version: 1, databasePath: '/tmp/r.sqlite', sizeBytes: 4096, schemaVersion: 9, exists: true,
        }));
      }
      return Promise.resolve(json({
        version: 1,
        checks: [{ id: 'runtime-port', status: 'warn', detail: '127.0.0.1:4372 is already in use (another Runtime or process).' }],
      }));
    }));

    render(<RuntimeDataPanel runtime={runtime} />);

    expect(await screen.findByText('listening')).toBeTruthy();
    expect(screen.getByText('本实例正在监听该端口。')).toBeTruthy();
    expect(screen.queryByText(/another Runtime/)).toBeNull();
  });
});
