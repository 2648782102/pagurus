import { describe, expect, it } from 'vitest';
import {
  buildBossWorkView,
  type BossWorkViewInput,
} from '../src/agent/boss-work-view.js';
import type { AgentChatConversation } from '../src/shared/api/agent-chat.js';
import type { OrganizationSessionView } from '../src/shared/api/organization.js';

function conversation(): AgentChatConversation {
  return {
    version: '1.9.0',
    id: 'chat_boss',
    agentId: 'boss-agent',
    agentRevisionId: 'agr_boss',
    providerId: 'magpie',
    modelId: 'fixture/boss',
    configurationRevisionId: 'cfg_boss',
    reasoningEffort: 'high',
    messages: [],
  };
}

function session(): OrganizationSessionView {
  return {
    version: '1.1.0',
    bossSession: {
      version: 1, id: 'boss_1', state: 'active', projectIds: ['project_hot'],
    },
    projects: [{
      version: 1, id: 'project_hot', bossSessionId: 'boss_1',
      originTriggerId: 'int_hot', state: 'active',
    }],
    delegations: [{
      version: 1, id: 'del_hot', projectId: 'project_hot', workerId: 'worker_hot',
      parentDelegationId: null,
      scope: ['web'], capabilities: [], maxDelegationDepth: 0, expiresAtSequence: 50,
      authorizationDigest: 'sha256_auth', state: 'active',
    }],
    workers: [{
      version: 1, id: 'worker_hot', projectId: 'project_hot', delegationId: 'del_hot',
      agentRevisionId: 'agr_worker', instructionsDigest: 'sha256_x', displayName: '热点检索员',
      model: { providerId: 'magpie', modelId: 'fixture/worker' }, state: 'blocked',
    }],
    reports: [{
      version: 1, id: 'rpt_hot', projectId: 'project_hot', workerId: 'worker_hot',
      state: 'failed', summaryDigest: 'sha256_report', sequence: 5,
    }],
    attentionRequests: [],
  };
}

function input(): BossWorkViewInput {
  return {
    conversation: conversation(),
    session: session(),
    messages: [
      {
        id: 'amsg_user', sequence: 1, author: 'user', body: '去搜一下百度热门前三',
        state: 'published', taskId: null, error: null, phase: 'accepted', progress: null,
        updatedAt: '2026-11-25T09:59:00.000Z', replyToId: null, activity: [],
      },
      {
        id: 'amsg_notice', sequence: 2, author: 'runtime',
        body: '员工 热点检索员（worker_hot）失败。 Agent loop exceeded 6 iterations.',
        state: 'replied', taskId: null, error: null, phase: 'terminal', progress: null,
        updatedAt: '2026-11-25T10:00:01.000Z', replyToId: null, activity: [],
      },
    ],
  };
}

describe('Boss work view', () => {
  it('projects durable organization facts into one readable work chain', () => {
    const view = buildBossWorkView(input());
    expect(view.projects).toHaveLength(1);
    expect(view.projects[0]?.workers[0]).toMatchObject({
      name: '热点检索员',
      state: 'blocked',
      reportState: 'failed',
    });
    expect(view.projects[0]?.workers[0]?.reportDetail).toContain('Agent loop exceeded 6 iterations.');
  });

  it('attaches runtime notices to the matching worker report', () => {
    const view = buildBossWorkView(input());
    expect(view.notices).toHaveLength(1);
    expect(view.notices[0]?.kind).toBe('report');
    expect(view.notices[0]?.workerName).toBe('热点检索员');
    expect(view.notices[0]?.state).toBe('failed');
  });

  it('reports open attention even when it has no project match', () => {
    const next = input();
    const withAttention = {
      ...next,
      session: {
        ...next.session!,
        attentionRequests: [{
          version: 1 as const, id: 'att_1', projectId: 'project_hot',
          workerId: 'worker_hot', state: 'open', questionDigest: 'sha256_q',
          sequence: 7, expectedVersion: 2,
        }],
      },
    };
    const view = buildBossWorkView(withAttention);
    expect(view.attention).toHaveLength(1);
    expect(view.attention[0]?.state).toBe('open');
    expect(view.projects[0]?.attentionCount).toBe(1);
  });

  it('returns an empty view without organization facts', () => {
    const view = buildBossWorkView({ conversation: conversation(), session: null, messages: [] });
    expect(view.projects).toEqual([]);
    expect(view.notices).toEqual([]);
    expect(view.attention).toEqual([]);
  });
});
