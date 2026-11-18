// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App.js';
import type { ExecutionRequest } from '../src/shared/api/execution.js';
import { useExecutionConsole } from '../src/features/execution/useExecutionConsole.js';

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
  executionRunContract: '1.3.0',
  executionRunPaths: 8,
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
      if (path === '/v1/execution/adapters') {
        return Promise.resolve(json({ version: '1.3.0', adapters: [{
          version: '1.3.0', id: 'adapter_isolated_local_v2', kind: 'isolated-local-worker',
          operations: ['hash', 'echo_length', 'fixed_matrix'], maxInputBytes: 4096, maxRuntimeMs: 2000,
          network: 'forbidden', filesystem: 'no-user-paths', createdAt: '2026-11-14T00:00:00.000Z',
        }] }));
      }
      if (path === '/v1/execution/runs') {
        return Promise.resolve(json({ version: '1.3.0', runs: [] }));
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

  it('keeps locally created requests across a console refresh', async () => {
    // Conchbase publishes no request-list route. A refresh must not erase the
    // requests this console created, so they stay outside the read snapshot.
    const grant = {
      version: '1.2.0', id: 'grant_alpha', capabilityId: capability.id, state: 'granted',
      expectedVersion: 1, agentId: 'agent_alpha', agentRevisionId: 'revision_alpha',
      configurationRevisionId: 'config_alpha', delegationId: 'delegation_alpha',
      projectId: 'project_alpha', workItemId: 'work_alpha', assignmentId: 'assignment_alpha',
      operation: 'observe', destinationDigest, scope: ['project:console-demo'],
      capabilities: ['cap_read_context'], expiresAtSequence: 100,
      createdAt: '2026-11-14T00:00:00.000Z',
    };
    const request = {
      version: '1.2.0', id: 'request_alpha', grantId: grant.id, state: 'pending',
      expectedVersion: 1, operation: 'observe', argumentsDigest: digest,
      idempotencyKey: 'idem-alpha', resultDigest: null, errorDigest: null,
      createdAt: '2026-11-14T00:00:00.000Z', decidedAt: null, startedAt: null, finishedAt: null,
    };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/runtime') return Promise.resolve(json(runtime));
      if (path === '/v1/execution/capabilities') {
        return Promise.resolve(json({ version: '1.2.0', capabilities: [capability] }));
      }
      if (path === '/v1/execution/grants') {
        return Promise.resolve(json({ version: '1.2.0', grants: [grant] }));
      }
      if (path.startsWith('/v1/execution/events')) {
        return Promise.resolve(json({ version: '1.2.0', events: [], nextCursor: null, hasMore: false }));
      }
      if (path === '/v1/execution/requests') {
        return Promise.resolve(json({ version: '1.2.0', request }, 201));
      }
      if (path === '/v1/execution/adapters') return Promise.resolve(json({ version: '1.3.0', adapters: [] }));
      if (path === '/v1/execution/runs') return Promise.resolve(json({ version: '1.3.0', runs: [] }));
      return Promise.resolve(json({}));
    }));

    function Harness() {
      const consoleState = useExecutionConsole(runtime as never);
      return <>
        <p role="status">{consoleState.requests.length}</p>
        <button type="button" onClick={() => consoleState.createRequest(grant as never)}>create request</button>
        <button type="button" onClick={consoleState.load}>reload</button>
      </>;
    }

    render(<Harness />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'create request' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'create request' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('1'));

    fireEvent.click(screen.getByRole('button', { name: 'reload' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('1'));
  });

  it('separates recorded capability facts from explicit grants and execution', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: '受控执行工作台' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '能力记录' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '显式授权' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '请求与结果' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '隔离执行 Runs' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Run 审计事件' })).toBeTruthy();
    expect(screen.getByText(/不安装 MCP/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '创建显式授权' })).toBeTruthy();
  });

  it('does not claim nothing was published while the first read is still in flight', async () => {
    let release: (() => void) | undefined;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const base = vi.mocked(globalThis.fetch).getMockImplementation()!;
    vi.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
      if (String(input) === '/v1/execution/grants') await held;
      return base(input, init);
    });

    render(<App />);

    expect(await screen.findByText('正在读取显式授权…')).toBeTruthy();
    expect(screen.queryByText('Runtime 尚未发布授权。')).toBeNull();
    expect(screen.queryByText('正在读取执行请求…')).toBeTruthy();

    release?.();
    expect(await screen.findByText('Runtime 尚未发布授权。')).toBeTruthy();
    expect(screen.queryByText('正在读取显式授权…')).toBeNull();
  });

  it('surfaces a failed run creation instead of silently ignoring it', async () => {
    const grant = {
      version: '1.2.0', id: 'grant_alpha', capabilityId: capability.id,
      state: 'granted', expectedVersion: 1,
      agentId: 'agt_alpha', agentRevisionId: 'agr_alpha',
      configurationRevisionId: 'cfg_alpha', delegationId: 'del_alpha',
      projectId: 'project_alpha', workItemId: 'work_alpha', assignmentId: 'asg_alpha',
      operation: 'observe', destinationDigest,
      scope: ['project:alpha'], capabilities: ['cap_read_context'],
      expiresAtSequence: 100, createdAt: '2026-11-16T00:00:00.000Z', revokedAt: null,
    };
    const request: ExecutionRequest = {
      version: '1.2.0', id: 'req_alpha', state: 'succeeded', expectedVersion: 2,
      grantId: grant.id, operation: 'observe', argumentsDigest: digest,
      idempotencyKey: 'idem_alpha', resultDigest: digest, errorDigest: null,
      createdAt: '2026-11-16T00:00:00.000Z', decidedAt: null,
      startedAt: null, finishedAt: null,
    };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path.includes('/v1/health')) return Promise.resolve(json({ status: 'ok', service: 'conchbase', apiVersion: 1 }));
      if (path.includes('/v1/runtime')) return Promise.resolve(json(runtime));
      if (path === '/v1/execution/capabilities') return Promise.resolve(json({ version: '1.2.0', capabilities: [capability] }));
      if (path === '/v1/execution/grants') return Promise.resolve(json({ version: '1.2.0', grants: [grant] }));
      if (path.startsWith('/v1/execution/events')) {
        return Promise.resolve(json({ version: '1.2.0', events: [], nextCursor: null, hasMore: false }));
      }
      if (path === '/v1/execution/adapters') {
        return Promise.resolve(json({ version: '1.3.0', adapters: [{
          version: '1.3.0', id: 'adapter_isolated_local_v2', kind: 'isolated-local-worker',
          operations: ['hash', 'echo_length', 'fixed_matrix'], maxInputBytes: 4096, maxRuntimeMs: 2000,
          network: 'forbidden', filesystem: 'no-user-paths', createdAt: '2026-11-14T00:00:00.000Z',
        }] }));
      }
      if (path === '/v1/execution/runs' && init?.method === 'POST') {
        return Promise.resolve(json({ error: 'run adapter unavailable' }, 503));
      }
      if (path === '/v1/execution/runs') return Promise.resolve(json({ version: '1.3.0', runs: [] }));
      if (path === '/v1/execution/requests') return Promise.resolve(json({ version: '1.2.0', requests: [request] }));
      return Promise.resolve(json({}));
    }));

    function Harness() {
      const consoleState = useExecutionConsole(runtime as never);
      return <>
        <p role="alert">{consoleState.error}</p>
        {consoleState.phase === 'ready' && (
          <button type="button" onClick={() => consoleState.createRun(request)}>create run</button>
        )}
      </>;
    }

    render(<Harness />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'create run' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'create run' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('HTTP 503'));
  });
});
