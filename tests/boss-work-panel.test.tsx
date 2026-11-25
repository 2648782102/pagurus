// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BossWorkPanel } from '../src/agent/BossWorkPanel.js';
import { getOrganizationSession } from '../src/shared/api/organization.js';
import { supportsOrganizationContract } from '../src/shared/api/organization.js';

const runtime = {
  name: 'Conchbase',
  version: '1.0.0',
  state: 'ready',
  capabilities: [],
  organizationContract: '1.1.0',
  organizationPaths: 18,
} as never;

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Boss work panel', () => {
  it('shows the work chain inside the conversation', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes('/v1/organization/session')) {
        return Promise.resolve(json({
          version: '1.1.0',
          bossSession: { version: 1, id: 'boss_1', state: 'active', projectIds: ['project_hot'] },
          projects: [{ version: 1, id: 'project_hot', bossSessionId: 'boss_1', originTriggerId: 'int_hot', state: 'active' }],
          delegations: [{ version: 1, id: 'del_hot', projectId: 'project_hot', workerId: 'worker_hot', parentDelegationId: null, scope: [], capabilities: [], maxDelegationDepth: 0, expiresAtSequence: 50, authorizationDigest: 'sha256_auth', state: 'active' }],
          attentionRequests: [],
          workers: [{ version: 1, id: 'worker_hot', projectId: 'project_hot', delegationId: 'del_hot', agentRevisionId: 'agr_worker', instructionsDigest: 'sha256_x', displayName: '热点检索员', model: { providerId: 'magpie', modelId: 'fixture/worker' }, state: 'blocked' }],
          reports: [{ version: 1, id: 'rpt_hot', projectId: 'project_hot', workerId: 'worker_hot', state: 'failed', summaryDigest: 'sha256_report', sequence: 5 }],
        }));
      }
      return Promise.resolve(json({ error: 'not found' }));
    }));
    const session = await getOrganizationSession();
    expect(session.projects).toHaveLength(1);
    expect(supportsOrganizationContract(runtime)).toBe(true);
    render(
      <BossWorkPanel
        runtime={runtime}
        messages={[{
          id: 'u1', sequence: 1, author: 'user', body: '查热点', state: 'published',
          taskId: null, error: null, phase: 'accepted', progress: null,
          updatedAt: '2026-11-25T10:00:00.000Z', replyToId: null, activity: [],
        }]}
      />,
    );
    expect(await screen.findByRole('heading', { name: '正在推进' })).toBeTruthy();
    expect(await screen.findByText('热点检索员')).toBeTruthy();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });
});
