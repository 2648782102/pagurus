import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  decideOrganizationAttention,
  getOrganizationAttention,
  getOrganizationEvents,
  getOrganizationProjectThreads,
  getOrganizationSession,
  listOrganizationDelegations,
  listOrganizationAttentionFrom,
  listOrganizationReports,
  listOrganizationWorkItems,
  organizationWorkerProposals,
  submitOrganizationIntent,
  supportsOrganizationContract,
} from '../src/shared/api/organization.js';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const session = {
  version: '1.1.0',
  bossSession: { version: 1, id: 'boss_alpha', state: 'active', projectIds: ['project_alpha'] },
  projects: [{ version: 1, id: 'project_alpha', bossSessionId: 'boss_alpha', originTriggerId: 'trigger_one', state: 'active' }],
  delegations: [],
  workers: [{
    version: 1,
    id: 'worker_alpha',
    projectId: 'project_alpha',
    delegationId: 'delegation_alpha',
    agentRevisionId: 'revision_alpha',
    displayName: 'Worker',
    instructionsDigest: 'sha256_instructions',
    model: { providerId: 'local', modelId: 'fixture' },
    state: 'proposed',
  }],
  reports: [],
  attentionRequests: [{
    version: 1,
    id: 'attention_alpha',
    projectId: 'project_alpha',
    workerId: 'worker_alpha',
    state: 'open',
    questionDigest: 'sha256_question',
    sequence: 2,
    expectedVersion: 2,
  }],
};

const eventPage = {
  version: '1.1.0',
  events: [{ id: 'evt_alpha', sequence: 1, type: 'organization.project_opened', projectId: 'project_alpha', data: {}, expectedVersion: 1 }],
  nextCursor: 'evt_alpha',
  hasMore: false,
};

describe('organization typed client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path.startsWith('/v1/organization/session/intents')) {
        return Promise.resolve(json({ version: '1.1.0', intentId: 'int_alpha', state: 'accepted', expectedSequence: 2 }, 202));
      }
      if (path.startsWith('/v1/organization/attention/')) {
        return Promise.resolve(json({ version: '1.1.0', attentionRequest: session.attentionRequests[0] }));
      }
      if (path.startsWith('/v1/organization/events')) return Promise.resolve(json(eventPage));
      if (path.startsWith('/v1/organization/projects/') && path.endsWith('/threads')) {
        return Promise.resolve(json({
          version: '1.1.0',
          projectId: 'project_alpha',
          threads: [{ eventId: 'evt_alpha', sequence: 1, type: 'organization.project_opened' }],
        }));
      }
      if (path.startsWith('/v1/organization/attention/')) {
        return Promise.resolve(json({ version: '1.1.0', attentionRequest: session.attentionRequests[0] }));
      }
      if (path === '/v1/organization/reports') {
        return Promise.resolve(json({ version: '1.1.0', reports: [] }));
      }
      if (path === '/v1/organization/work-items') {
        return Promise.resolve(json({ version: '1.1.0', workItems: [] }));
      }
      if (path === '/v1/organization/delegations') {
        return Promise.resolve(json({ version: '1.1.0', delegations: [] }));
      }
      if (path === '/v1/organization/session') return Promise.resolve(json(session));
      return Promise.resolve(json({}));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gates on published 1.1.0 discovery rather than URL guessing', () => {
    expect(supportsOrganizationContract(null)).toBe(false);
    expect(supportsOrganizationContract({
      name: 'Conchbase',
      version: '1.0.0',
      state: 'ready',
      capabilities: [],
    })).toBe(false);
    expect(supportsOrganizationContract({
      name: 'Conchbase',
      version: '1.0.0',
      state: 'ready',
      capabilities: [],
      organizationContract: '1.1.0',
      organizationPaths: 18,
    })).toBe(true);
  });

  it('reads published facts, orders attention first, and keeps proposals digest-only', async () => {
    await expect(getOrganizationSession()).resolves.toEqual(session);
    await expect(getOrganizationEvents()).resolves.toEqual(eventPage);
    await expect(getOrganizationProjectThreads('project_alpha')).resolves.toMatchObject({
      projectId: 'project_alpha',
    });
    await expect(getOrganizationAttention('attention_alpha')).resolves.toMatchObject({
      version: '1.1.0',
    });
    await expect(listOrganizationReports()).resolves.toEqual({ version: '1.1.0', reports: [] });
    await expect(listOrganizationWorkItems()).resolves.toEqual({ version: '1.1.0', workItems: [] });
    await expect(listOrganizationDelegations()).resolves.toEqual({ version: '1.1.0', delegations: [] });
    expect(listOrganizationAttentionFrom(session as never).attentionRequests[0]?.state).toBe('open');
    expect(organizationWorkerProposals(session as never)[0]).toMatchObject({
      workerId: 'worker_alpha',
      instructionsDigest: 'sha256_instructions',
    });
    expect(organizationWorkerProposals(session as never)[0]).not.toHaveProperty('instructions');
  });

  it('submits intents and attention decisions with bounded published contracts', async () => {
    await expect(submitOrganizationIntent({
      text: 'Plan project beta',
      idempotencyKey: 'fixture',
    })).resolves.toMatchObject({ state: 'accepted', intentId: 'int_alpha' });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({ intent: { text: 'Plan project beta', idempotencyKey: 'fixture' } });

    await expect(decideOrganizationAttention('attention_alpha', 'answer', 2, 'sha256_decision')).resolves.toMatchObject({
      version: '1.1.0',
    });
    const answerCall = fetchMock.mock.calls.at(-1);
    expect(String(answerCall?.[0])).toBe('/v1/organization/attention/attention_alpha/answer');
    expect(JSON.parse(String(answerCall?.[1]?.body))).toEqual({
      expectedVersion: 2,
      decisionDigest: 'sha256_decision',
    });
  });
});
