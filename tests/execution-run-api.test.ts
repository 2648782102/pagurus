import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createExecutionRun,
  getExecutionRunEvents,
  getExecutionRunHealth,
  listExecutionAdapters,
  listExecutionRuns,
  recoverExecutionRun,
  startExecutionRun,
  supportsExecutionRunContract,
} from '../src/shared/api/execution-runs.js';

const digest = `sha256:${'a'.repeat(64)}`;

const adapter = {
  version: '1.3.0', id: 'adapter_isolated_local_v2', kind: 'isolated-local-worker',
  operations: ['hash', 'echo_length', 'fixed_matrix'], maxInputBytes: 4096, maxRuntimeMs: 2000,
  network: 'forbidden', filesystem: 'no-user-paths', createdAt: '2026-11-14T00:00:00.000Z',
};

const run = {
  version: '1.3.0', id: 'xrn_alpha', requestId: 'xrq_alpha', grantId: 'xgt_alpha',
  operation: 'hash', argumentsDigest: digest, adapterId: adapter.id, state: 'queued',
  attempt: 1, expectedVersion: 1, workerPidDigest: null, exitCode: null,
  resultDigest: null, errorDigest: null, idempotencyKey: 'run-alpha',
  createdAt: '2026-11-14T00:00:00.000Z', startedAt: null, finishedAt: null,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('isolated execution run typed client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === '/v1/execution/run-health') return Promise.resolve(json({ version: '1.3.0', status: 'ready', paths: [] }));
      if (path === '/v1/execution/adapters') return Promise.resolve(json({ version: '1.3.0', adapters: [adapter] }));
      if (path === '/v1/execution/runs' && init?.method === 'POST') return Promise.resolve(json({ version: '1.3.0', run }, 201));
      if (path === '/v1/execution/runs') return Promise.resolve(json({ version: '1.3.0', runs: [run] }));
      if (path.endsWith('/start')) return Promise.resolve(json({ version: '1.3.0', run: { ...run, state: 'succeeded' } }));
      if (path.endsWith('/recover')) return Promise.resolve(json({ version: '1.3.0', run: { ...run, state: 'queued', attempt: 2 } }));
      if (path.endsWith('/events')) return Promise.resolve(json({
        version: '1.3.0', events: [], nextCursor: null, hasMore: false,
      }));
      return Promise.resolve(json({ version: '1.3.0', run }));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('gates on optional executionRunContract discovery', () => {
    expect(supportsExecutionRunContract(null)).toBe(false);
    expect(supportsExecutionRunContract({
      name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [],
      executionContract: '1.2.0', executionPaths: 8,
    })).toBe(false);
    expect(supportsExecutionRunContract({
      name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [],
      executionContract: '1.2.0', executionPaths: 8,
      executionRunContract: '1.3.0', executionRunPaths: 8,
    })).toBe(true);
  });

  it('reads and writes published run contracts', async () => {
    await expect(getExecutionRunHealth()).resolves.toMatchObject({ version: '1.3.0', status: 'ready' });
    await expect(listExecutionAdapters()).resolves.toMatchObject({ version: '1.3.0' });
    await expect(listExecutionRuns()).resolves.toMatchObject({ version: '1.3.0' });
    await expect(getExecutionRunEvents('xrn_alpha')).resolves.toMatchObject({ version: '1.3.0' });
    await expect(createExecutionRun({
      requestId: run.requestId,
      expectedRequestVersion: 1,
      grantId: run.grantId,
      operation: 'hash',
      argumentsDigest: digest,
      adapterId: adapter.id,
      idempotencyKey: 'run-alpha',
    })).resolves.toMatchObject({ version: '1.3.0' });
    await expect(startExecutionRun('xrn_alpha', 1)).resolves.toMatchObject({ version: '1.3.0' });
    await expect(recoverExecutionRun('xrn_alpha', 2)).resolves.toMatchObject({ version: '1.3.0' });
  });
});
