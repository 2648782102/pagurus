// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
        }, {
          id: 'n1', sequence: 2, author: 'runtime',
          body: '员工 热点检索员（worker_hot）失败。 Agent loop exceeded 6 iterations.',
          state: 'replied', taskId: null, error: null, phase: 'terminal', progress: null,
          updatedAt: '2026-11-25T10:00:01.000Z', replyToId: null, activity: [],
        }]}
      />,
    );
    expect(await screen.findByRole('complementary', { name: '正在推进' })).toBeTruthy();
    const headings = screen.getAllByRole('heading').map((node) => node.textContent ?? '');
    expect(headings.indexOf('需要你处理')).toBeLessThan(headings.indexOf('项目'));
    const worker = await screen.findByText((_, node) => node?.className === 'boss-work-worker-name' && node.textContent === '热点检索员');
    expect(worker.closest('li')?.className).toContain('is-failed');
    expect(worker.closest('li')?.textContent).toContain('Agent loop exceeded 6 iterations.');
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });
});

describe('Boss work rail resilience', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('keeps the rail visible with a readable error after a failed organization read', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: 'boom' }), {
      status: 500, headers: { 'content-type': 'application/json' },
    }))));
    render(
      <BossWorkPanel
        runtime={runtime}
        messages={[]}
      />,
    );
    const rail = await screen.findByRole('complementary', { name: '正在推进' });
    expect(rail.textContent).toContain('组织状态暂时无法读取');
    expect(screen.getByRole('button', { name: '重试读取组织状态' })).toBeTruthy();
  });

  it('offers a collapse control for the compact work strip', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes('/v1/organization/session')) {
        return Promise.resolve(json({
          version: '1.1.0',
          bossSession: { version: 1, id: 'boss_1', state: 'active', projectIds: [] },
          projects: [], delegations: [], workers: [], reports: [], attentionRequests: [],
        }));
      }
      return Promise.resolve(json({ error: 'not found' }));
    }));
    render(<BossWorkPanel runtime={runtime} messages={[]} />);
    const toggle = await screen.findByRole('button', { name: '收起工作面板' });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: '展开工作面板' })).toBeTruthy();
  });

  it('binds named motion classes to active organization state', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes('/v1/organization/session')) {
        return Promise.resolve(json({
          version: '1.1.0',
          bossSession: { version: 1, id: 'boss_1', state: 'active', projectIds: ['project_hot'] },
          projects: [{ version: 1, id: 'project_hot', bossSessionId: 'boss_1', originTriggerId: 'int_hot', state: 'active' }],
          delegations: [{ version: 1, id: 'del_hot', projectId: 'project_hot', workerId: 'worker_hot', parentDelegationId: null, scope: [], capabilities: [], maxDelegationDepth: 0, expiresAtSequence: 50, authorizationDigest: 'sha256_auth', state: 'active' }],
          attentionRequests: [],
          workers: [{ version: 1, id: 'worker_hot', projectId: 'project_hot', delegationId: 'del_hot', agentRevisionId: 'agr_worker', instructionsDigest: 'sha256_x', displayName: '热点检索员', model: { providerId: 'magpie', modelId: 'fixture/worker' }, state: 'running' }],
          reports: [],
        }));
      }
      return Promise.resolve(json({ error: 'not found' }));
    }));
    const { container } = render(<BossWorkPanel runtime={runtime} messages={[]} />);
    await screen.findByRole('complementary', { name: '正在推进' });
    expect(container.querySelector('.boss-work-project')?.className).toContain('anim-live-sweep');
    expect(container.querySelector('.boss-work-dot')?.className).toContain('anim-live-orbit');
  });
});
