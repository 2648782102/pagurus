import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createExecutionGrant,
  createExecutionRequest,
  decideExecutionRequest,
  getExecutionEvents,
  getExecutionHealth,
  listExecutionCapabilities,
  listExecutionGrants,
  revokeExecutionGrant,
  supportsExecutionContract,
} from '../src/shared/api/execution.js';

const digest = `sha256:${'a'.repeat(64)}`;
const destinationDigest = 'sha256:5171f8f3e1172a39059a36998e84b69b57553e0645fe8d34660f7b2347ac6e82';

const capability = {
  version: '1.2.0',
  id: 'cap_fake_observe',
  kind: 'fake',
  name: 'fake-observe',
  adapterId: 'fake-bounded-executor',
  destinationDigest,
  capabilitiesDigest: digest,
  state: 'enabled',
  createdAt: '2026-11-14T00:00:00.000Z',
};

const grant = {
  version: '1.2.0',
  id: 'xgt_alpha',
  capabilityId: capability.id,
  state: 'granted',
  expectedVersion: 1,
  agentId: 'agt_alpha',
  agentRevisionId: 'agr_alpha',
  configurationRevisionId: 'cfg_alpha',
  delegationId: 'del_alpha',
  projectId: 'project_alpha',
  workItemId: 'work_alpha',
  assignmentId: 'asg_alpha',
  operation: 'observe',
  destinationDigest,
  scope: ['project:alpha'],
  capabilities: ['cap_read_context'],
  expiresAtSequence: 100,
  createdAt: '2026-11-14T00:00:00.000Z',
  revokedAt: null,
};

const request = {
  version: '1.2.0',
  id: 'xrq_alpha',
  grantId: grant.id,
  state: 'pending',
  expectedVersion: 1,
  operation: 'observe',
  argumentsDigest: digest,
  idempotencyKey: 'idem-alpha',
  resultDigest: null,
  errorDigest: null,
  createdAt: '2026-11-14T00:00:00.000Z',
  decidedAt: null,
  startedAt: null,
  finishedAt: null,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('controlled execution typed client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === '/v1/execution/health') return Promise.resolve(json({ version: '1.2.0', status: 'ready', paths: [] }));
      if (path === '/v1/execution/capabilities') return Promise.resolve(json({ version: '1.2.0', capabilities: [capability] }));
      if (path === '/v1/execution/grants' && init?.method === 'POST') {
        return Promise.resolve(json({ version: '1.2.0', grant }, 201));
      }
      if (path === '/v1/execution/grants') return Promise.resolve(json({ version: '1.2.0', grants: [grant] }, 200));
      if (path.startsWith('/v1/execution/grants/')) return Promise.resolve(json({ version: '1.2.0', grant: { ...grant, state: 'revoked' } }));
      if (path === '/v1/execution/requests') return Promise.resolve(json({ version: '1.2.0', request }, 201));
      if (path.startsWith('/v1/execution/requests/') && path.endsWith('/decide')) {
        return Promise.resolve(json({ version: '1.2.0', request: { ...request, state: 'succeeded' } }));
      }
      if (path.startsWith('/v1/execution/requests/')) return Promise.resolve(json({ version: '1.2.0', request }));
      if (path.startsWith('/v1/execution/events')) {
        return Promise.resolve(json({
          version: '1.2.0',
          events: [{ version: '1.2.0', id: 'exe_alpha', sequence: 1, type: 'execution.grant_created', data: {}, createdAt: '2026-11-14T00:00:00.000Z' }],
          nextCursor: 'exe_alpha',
          hasMore: false,
        }));
      }
      return Promise.resolve(json({}));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('gates on optional 1.2.0 discovery', () => {
    expect(supportsExecutionContract(null)).toBe(false);
    expect(supportsExecutionContract({ name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [] })).toBe(false);
    expect(supportsExecutionContract({
      name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [], executionContract: '1.2.0', executionPaths: 8,
    })).toBe(true);
  });

  it('reads and writes only published execution contracts', async () => {
    await expect(getExecutionHealth()).resolves.toMatchObject({ version: '1.2.0', status: 'ready' });
    await expect(listExecutionCapabilities()).resolves.toMatchObject({ version: '1.2.0' });
    await expect(listExecutionGrants()).resolves.toMatchObject({ version: '1.2.0' });
    await expect(getExecutionEvents()).resolves.toMatchObject({ version: '1.2.0' });
    await expect(createExecutionGrant({
      capabilityId: capability.id,
      agentId: grant.agentId,
      agentRevisionId: grant.agentRevisionId,
      configurationRevisionId: grant.configurationRevisionId,
      delegationId: grant.delegationId,
      projectId: grant.projectId,
      workItemId: grant.workItemId,
      assignmentId: grant.assignmentId,
      operation: grant.operation,
      destinationDigest,
      scope: grant.scope,
      capabilities: grant.capabilities,
      expiresAtSequence: 100,
    })).resolves.toMatchObject({ version: '1.2.0' });
    await expect(revokeExecutionGrant(grant.id, grant.expectedVersion)).resolves.toMatchObject({ version: '1.2.0' });
    await expect(createExecutionRequest({
      grantId: grant.id,
      expectedGrantVersion: grant.expectedVersion,
      operation: grant.operation,
      argumentsDigest: digest,
      idempotencyKey: 'idem-alpha',
    })).resolves.toMatchObject({ version: '1.2.0' });
    await expect(decideExecutionRequest(request.id, 1, 'approved', digest)).resolves.toMatchObject({ version: '1.2.0' });
  });
});
