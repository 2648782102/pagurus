import { describe, expect, it } from 'vitest';
import {
  deriveOrganizationView,
  firstOpenAttentionId,
  latestEventCursor,
  mergeOrganizationEvents,
  resolveSelectedProjectId,
} from '../src/features/organization/organization-view.js';

function event(id: string, sequence: number) {
  return { id, sequence, type: 'organization.project_opened', projectId: 'project_alpha', data: {}, expectedVersion: 1 };
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.1.0',
    bossSession: { version: 1, id: 'boss_alpha', state: 'active', projectIds: ['project_alpha'] },
    projects: [
      { version: 1, id: 'project_alpha', bossSessionId: 'boss_alpha', originTriggerId: 'trigger_one', state: 'active' },
      { version: 1, id: 'project_beta', bossSessionId: 'boss_alpha', originTriggerId: 'trigger_two', state: 'active' },
    ],
    delegations: [],
    workers: [{
      version: 1, id: 'worker_alpha', projectId: 'project_alpha', delegationId: 'delegation_alpha',
      agentRevisionId: 'revision_alpha', displayName: 'Worker', instructionsDigest: 'sha256_instructions',
      model: { providerId: 'local', modelId: 'fixture' }, state: 'proposed',
    }],
    reports: [],
    attentionRequests: [
      {
        version: 1, id: 'attention_late', projectId: 'project_alpha', workerId: 'worker_alpha',
        state: 'answered', questionDigest: 'sha256_q1', sequence: 9, expectedVersion: 1,
      },
      {
        version: 1, id: 'attention_open', projectId: 'project_alpha', workerId: 'worker_alpha',
        state: 'open', questionDigest: 'sha256_q2', sequence: 4, expectedVersion: 1,
      },
    ],
    ...overrides,
  };
}

describe('organization event merging', () => {
  it('replaces the timeline on a full load', () => {
    const merged = mergeOrganizationEvents(
      [event('evt_old', 1)],
      [event('evt_b', 2), event('evt_a', 3)],
      'full',
    );
    expect(merged.map((entry) => entry.id)).toEqual(['evt_b', 'evt_a']);
  });

  it('appends incremental pages without duplicating replayed events', () => {
    const merged = mergeOrganizationEvents(
      [event('evt_a', 1), event('evt_b', 2)],
      [event('evt_b', 2), event('evt_c', 3)],
      'incremental',
    );
    expect(merged.map((entry) => entry.id)).toEqual(['evt_a', 'evt_b', 'evt_c']);
  });

  it('keeps the published sequence order regardless of arrival order', () => {
    const merged = mergeOrganizationEvents([], [event('evt_late', 9), event('evt_early', 2)], 'incremental');
    expect(merged.map((entry) => entry.sequence)).toEqual([2, 9]);
  });

  it('reports the newest cursor and handles an empty timeline', () => {
    expect(latestEventCursor([])).toBeNull();
    expect(latestEventCursor([event('evt_a', 1), event('evt_b', 2)])).toBe('evt_b');
  });
});

describe('organization selection', () => {
  it('keeps a still-published project selection', () => {
    expect(resolveSelectedProjectId(session() as never, 'project_beta')).toBe('project_beta');
  });

  it('falls back to the first published project when the selection is gone', () => {
    expect(resolveSelectedProjectId(session() as never, 'project_removed')).toBe('project_alpha');
  });

  it('selects the open attention rather than a later answered one', () => {
    expect(firstOpenAttentionId(session() as never)).toBe('attention_open');
  });
});

describe('organization view derivation', () => {
  it('orders attention with open requests first, then by sequence', () => {
    const view = deriveOrganizationView(session() as never, [], 'attention_late', []);
    expect(view.orderedAttention.map((entry) => entry.id)).toEqual(['attention_open', 'attention_late']);
    expect(view.selectedAttention?.id).toBe('attention_late');
  });

  it('caps recent events at 24 and reverses them for display', () => {
    const events = Array.from({ length: 30 }, (_, index) => event(`evt_${index}`, index + 1));
    const view = deriveOrganizationView(session() as never, events, '', []);
    expect(view.recentEvents).toHaveLength(24);
    expect(view.recentEvents[0]?.sequence).toBe(30);
    expect(view.timeline[0]?.sequence).toBe(1);
  });

  it('prefers published work items over the worker-derived fallback', () => {
    const live = [{ workItemId: 'work_live', projectId: 'project_alpha', workerId: 'worker_alpha', state: 'running' }];
    const view = deriveOrganizationView(session() as never, [], '', live);
    expect(view.workItems).toEqual(live);
  });

  it('derives a worker work item when no live route is published', () => {
    const view = deriveOrganizationView(session() as never, [], '', []);
    expect(view.workItems[0]?.workItemId).toBe('work_worker_alpha');
  });

  it('renders an empty view without a session', () => {
    const view = deriveOrganizationView(null, [event('evt_a', 1)], '', []);
    expect(view.projects).toEqual([]);
    expect(view.selectedAttention).toBeUndefined();
    expect(view.timeline).toHaveLength(1);
  });
});
