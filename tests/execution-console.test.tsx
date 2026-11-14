// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App.js';

const digest = `sha256:${'a'.repeat(64)}`;
const destinationDigest = 'sha256:5171f8f3e1172a39059a36998e84b69b57553e0645fe8d34660f7b2347ac6e82';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const runtime = {
  name: 'Conchbase',
  version: '1.0.0',
  state: 'ready',
  capabilities: [],
  organizationContract: '1.1.0',
  organizationPaths: 18,
  executionContract: '1.2.0',
  executionPaths: 8,
};

const capability = {
  version: '1.2.0', id: 'cap_fake_observe', kind: 'fake', name: 'fake-observe',
  adapterId: 'fake-bounded-executor', destinationDigest, capabilitiesDigest: digest,
  state: 'enabled', createdAt: '2026-11-14T00:00:00.000Z',
};

describe('Controlled execution console', () => {
  beforeEach(() => {
    window.location.hash = '#execution-console';
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path.includes('/v1/health')) return Promise.resolve(json({ status: 'ok', service: 'conchbase', apiVersion: 1 }));
      if (path.includes('/v1/runtime')) return Promise.resolve(json(runtime));
      if (path === '/v1/execution/capabilities') return Promise.resolve(json({ version: '1.2.0', capabilities: [capability] }));
      if (path === '/v1/execution/grants') return Promise.resolve(json({ version: '1.2.0', grants: [] }));
      if (path.startsWith('/v1/execution/events')) {
        return Promise.resolve(json({ version: '1.2.0', events: [], nextCursor: null, hasMore: false }));
      }
      return Promise.resolve(json({}));
    }));
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.location.hash = '';
  });

  it('separates recorded capability facts from explicit grants and execution', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: '受控执行工作台' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '能力记录' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '显式授权' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '请求与结果' })).toBeTruthy();
    expect(screen.getByText(/不安装 MCP/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '创建显式授权' })).toBeTruthy();
  });
});
