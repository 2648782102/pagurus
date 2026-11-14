// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App.js';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const runtime = {
  name: 'Conchbase',
  version: '1.0.0',
  state: 'ready',
  capabilities: [],
  organizationContract: '1.1.0',
  organizationPaths: 18,
};

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

describe('Organization Console', () => {
  beforeEach(() => {
    window.location.hash = '#organization-console';
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path.includes('/v1/health')) return Promise.resolve(json({ status: 'ok', service: 'conchbase', apiVersion: 1 }));
      if (path.includes('/v1/runtime')) return Promise.resolve(json(runtime));
      if (path === '/v1/organization/session') return Promise.resolve(json(session));
      if (path === '/v1/organization/work-items') {
        return Promise.resolve(json({ version: '1.1.0', workItems: [] }));
      }
      if (path.startsWith('/v1/organization/projects/') && path.endsWith('/threads')) {
        return Promise.resolve(json({
          version: '1.1.0',
          projectId: 'project_alpha',
          threads: [{ eventId: 'evt_alpha', sequence: 1, type: 'organization.project_opened' }],
        }));
      }
      if (path.includes('/v1/organization/events')) {
        return Promise.resolve(json({
          version: '1.1.0',
          events: [{ id: 'evt_alpha', sequence: 1, type: 'organization.project_opened', projectId: 'project_alpha', data: {}, expectedVersion: 1 }],
          nextCursor: 'evt_alpha',
          hasMore: false,
        }));
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

  it('renders published organization facts without local authority controls', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: '单一主会话组织台' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '主会话时间线' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '项目与归档' })).toBeTruthy();
    expect(screen.getByText('项目创建')).toBeTruthy();
    expect(screen.getByLabelText('自动刷新')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Attention 优先队列' })).toBeTruthy();
    expect(screen.getAllByText('project_alpha').length).toBeGreaterThan(0);
    expect(screen.getByText('sha256_instructions')).toBeTruthy();
    expect(screen.getByText(/202 仅代表意图被接受/)).toBeTruthy();
    expect(screen.queryByText(/归档项目/)).toBeNull();
    expect(screen.queryByText(/创建 Agent revision/)).toBeNull();
  });
});
