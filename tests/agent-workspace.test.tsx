// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentWorkspace } from '../src/features/agents/AgentWorkspace.js';

const REV1 = {
  id: 'agr_00000000000000000000000000000001', name: 'Research', instructions: 'Be precise',
  providerId: 'magpie', modelId: 'fixture/model', createdAt: '2026-01-01T00:00:00.000Z',
};
const REV2 = { ...REV1, id: 'agr_00000000000000000000000000000002', name: 'Research v2', createdAt: '2026-01-02T00:00:00.000Z' };
const AGENT = {
  id: 'agt_00000000000000000000000000000001', currentRevisionId: REV1.id,
  archived: false, isDefault: true, current: REV1, revisions: [REV1],
};

function json(payload: unknown, status = 200): Response { return new Response(JSON.stringify(payload), { status }); }
function runtime(): Response { return json({ name: 'Conchbase', version: '0.8.0', state: 'ready', capabilities: ['agents', 'provider-neutral-model-catalog'] }); }
function catalog(): Response { return json({ models: [{ providerId: 'magpie', modelId: 'fixture/model', reference: 'magpie:fixture/model', displayName: 'Fixture model', capabilities: ['chat'] }] }); }

describe('AgentWorkspace', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('creates and edits a versioned profile using provider-neutral fields', async () => {
    fetchMock
      .mockResolvedValueOnce(runtime()).mockResolvedValueOnce(json({ agents: [] }))
      .mockResolvedValueOnce(catalog()).mockResolvedValueOnce(json({ agent: null }))
      .mockResolvedValueOnce(json({ agent: {
        ...AGENT,
        current: { ...REV1, name: 'Research', instructions: 'Be precise' },
        revisions: [{ ...REV1, name: 'Research', instructions: 'Be precise' }],
      } }, 201))
      .mockResolvedValueOnce(runtime()).mockResolvedValueOnce(json({ agents: [AGENT] }))
      .mockResolvedValueOnce(catalog()).mockResolvedValueOnce(json({ agent: AGENT }))
      .mockResolvedValueOnce(json({ agent: AGENT }));
    const onAgentsChanged = vi.fn();
    render(<AgentWorkspace onAgentsChanged={onAgentsChanged} />);
    await screen.findByLabelText('名称');
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: 'Research' } });
    fireEvent.change(screen.getByLabelText('Instructions'), { target: { value: 'Be precise' } });
    fireEvent.click(screen.getByRole('button', { name: '创建 Agent' }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([path, init]) => path === '/v1/agents' && init?.method === 'POST')).toBe(true));
    const createCall = fetchMock.mock.calls.find(([path, init]) => path === '/v1/agents' && init?.method === 'POST');
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      name: 'Research', instructions: 'Be precise', providerId: 'magpie', modelId: 'fixture/model',
    });
    await waitFor(() => expect(onAgentsChanged).toHaveBeenCalledTimes(1));
  });

  it('shows an explicit unsupported state without calling Agent routes on older runtimes', async () => {
    fetchMock.mockResolvedValueOnce(json({ name: 'Conchbase', version: '0.7.0', state: 'ready', capabilities: [] }));
    render(<AgentWorkspace />);
    expect(await screen.findByText('当前 Runtime 未开放 Agent 管理')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('selects the active default when earlier Agent entries are archived', async () => {
    const archived = { ...AGENT, archived: true, isDefault: false };
    const defaultAgent = {
      ...AGENT,
      id: 'agt_00000000000000000000000000000002',
      isDefault: true,
    };
    fetchMock
      .mockResolvedValueOnce(runtime())
      .mockResolvedValueOnce(json({ agents: [archived, defaultAgent] }))
      .mockResolvedValueOnce(catalog())
      .mockResolvedValueOnce(json({ agent: defaultAgent }))
      .mockResolvedValueOnce(json({ agent: { ...defaultAgent, revisions: [REV1] } }));

    render(<AgentWorkspace />);
    await screen.findByText('默认 Agent');
    expect((screen.getByLabelText('选择 Agent') as HTMLSelectElement).value).toBe(defaultAgent.id);
    expect((screen.getByLabelText('名称') as HTMLInputElement).disabled).toBe(false);
  });

  it('keeps two profiles independent through edit, rollback, duplicate, default, and archive', async () => {
    const secondRevision = {
      ...REV1,
      id: 'agr_00000000000000000000000000000003',
      name: 'Writer',
      instructions: 'Explain carefully',
      providerId: 'alternate',
      modelId: 'fixture/alt',
    };
    const records = new Map<string, { record: typeof AGENT; revisions: typeof REV1[] }>([
      [AGENT.id, { record: AGENT, revisions: [REV1] }],
      ['agt_00000000000000000000000000000002', {
        record: {
          ...AGENT,
          id: 'agt_00000000000000000000000000000002',
          currentRevisionId: secondRevision.id,
          isDefault: false,
          current: secondRevision,
        },
        revisions: [REV1, secondRevision],
      }],
    ]);
    let defaultAgentId: string | null = AGENT.id;
    let nextAgentNumber = 3;
    let nextRevisionNumber = 4;
    const makeRevision = (profile: typeof REV1, idNumber: number) => ({
      ...profile,
      id: `agr_${String(idNumber).padStart(32, '0')}`,
      createdAt: `2026-01-${String(idNumber).padStart(2, '0')}T00:00:00.000Z`,
    });
    const reply = (payload: unknown, status = 200) => Promise.resolve(json(payload, status));
    fetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
      if (url === '/v1/runtime') return json({
        name: 'Conchbase', version: '0.8.0', state: 'ready',
        capabilities: ['agents', 'provider-neutral-model-catalog'],
      });
      if (url === '/v1/model-catalog') return json({ models: [
        { providerId: 'magpie', modelId: 'fixture/model', reference: 'magpie:fixture/model', displayName: 'Fixture model', capabilities: ['chat'] },
        { providerId: 'alternate', modelId: 'fixture/alt', reference: 'alternate:fixture/alt', displayName: 'Alternate model', capabilities: ['chat'] },
      ] });
      if (url === '/v1/agents/default' && method === 'GET') {
        const record = defaultAgentId ? records.get(defaultAgentId)?.record : null;
        return json({ agent: record ? { ...record, isDefault: true } : null });
      }
      if (url === '/v1/agents/default' && method === 'PUT') {
        defaultAgentId = body.agentId as string | null;
        return json({ agent: defaultAgentId ? records.get(defaultAgentId)?.record ?? null : null });
      }
      if (url === '/v1/agents' && method === 'GET') {
        return json({ agents: [...records.values()].map(({ record }) => ({
          ...record, isDefault: record.id === defaultAgentId,
        })) });
      }
      if (url === '/v1/agents') return reply({ error: 'unexpected create' }, 500);
      const match = url.match(/^\/v1\/agents\/([^/]+)(?:\/(duplicate|archive|revisions\/apply))?$/);
      if (!match) return reply({ error: `unexpected request ${method} ${url}` }, 500);
      const [, agentId, operation] = match;
      const source = records.get(agentId!);
      if (!source) return reply({ error: 'missing agent' }, 404);
      if (operation === undefined && method === 'GET') {
        return json({ agent: { ...source.record, isDefault: source.record.id === defaultAgentId, revisions: source.revisions } });
      }
      if (operation === undefined && method === 'PATCH') {
        const profile = body.profile as typeof REV1;
        const revision = makeRevision(profile, nextRevisionNumber++);
        source.revisions.push(revision);
        source.record = { ...source.record, currentRevisionId: revision.id, current: revision };
        return json({ agent: { ...source.record, isDefault: source.record.id === defaultAgentId, revisions: source.revisions } });
      }
      if (operation === 'revisions/apply' && method === 'POST') {
        const historical = source.revisions.find((revision) => revision.id === body.revisionId)!;
        const revision = makeRevision(historical, nextRevisionNumber++);
        source.revisions.push(revision);
        source.record = { ...source.record, currentRevisionId: revision.id, current: revision };
        return json({ agent: { ...source.record, isDefault: source.record.id === defaultAgentId, revisions: source.revisions } });
      }
      if (operation === 'duplicate' && method === 'POST') {
        const revision = source.record.current;
        const id = `agt_${String(nextAgentNumber++).padStart(32, '0')}`;
        const copiedRevision = makeRevision({ ...revision, name: `${revision.name} copy` }, nextRevisionNumber++);
        const copied = { ...source.record, id, currentRevisionId: copiedRevision.id, archived: false, isDefault: false, current: copiedRevision };
        records.set(id, { record: copied, revisions: [copiedRevision] });
        return reply({ agent: { ...copied, revisions: [copiedRevision] } }, 201);
      }
      if (operation === 'archive' && method === 'POST') {
        source.record = { ...source.record, archived: true, isDefault: false };
        if (defaultAgentId === agentId) defaultAgentId = null;
        return json({ agent: source.record });
      }
      return reply({ error: `unexpected request ${method} ${url}` }, 500);
    });
    vi.stubGlobal('confirm', vi.fn(() => true));

    render(<AgentWorkspace />);
    const select = await screen.findByLabelText('选择 Agent') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'agt_00000000000000000000000000000002' } });
    await waitFor(() => expect((screen.getByLabelText('名称') as HTMLInputElement).value).toBe('Writer'));
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: 'Writer revised' } });
    fireEvent.change(screen.getByLabelText('Instructions'), { target: { value: 'Use a shorter style' } });
    fireEvent.change(screen.getByLabelText('默认模型'), { target: { value: 'magpie:fixture/model' } });
    fireEvent.click(screen.getByRole('button', { name: '保存新版本' }));
    expect(await screen.findByText('已保存为新的不可变版本。')).toBeTruthy();

    const originalAgent = records.get(AGENT.id)!;
    const editedAgent = records.get('agt_00000000000000000000000000000002')!;
    expect(originalAgent.revisions).toHaveLength(1);
    expect(editedAgent.revisions).toHaveLength(3);
    expect(editedAgent.record.current).toMatchObject({ name: 'Writer revised', providerId: 'magpie' });

    fireEvent.click(screen.getAllByRole('button', { name: '恢复此版本' })[0]!);
    await waitFor(() => expect(editedAgent.revisions).toHaveLength(4));
    expect(editedAgent.record.current).toMatchObject({ name: 'Writer', instructions: 'Explain carefully', providerId: 'alternate' });

    fireEvent.click(screen.getByRole('button', { name: '复制' }));
    await screen.findByText('已创建 Agent 副本。');
    const duplicateId = (screen.getByLabelText('选择 Agent') as HTMLSelectElement).value;
    expect(duplicateId).not.toBe(AGENT.id);
    expect(duplicateId).not.toBe(editedAgent.record.id);
    expect(records.get(duplicateId)?.record.current).toMatchObject({ name: 'Writer copy', providerId: 'alternate' });

    fireEvent.click(screen.getByRole('button', { name: '设为默认' }));
    await screen.findByText('默认 Agent 已更新。');
    expect(defaultAgentId).toBe(duplicateId);
    fireEvent.click(screen.getByRole('button', { name: '归档' }));
    await screen.findByText('Agent 已归档。');
    expect(records.get(duplicateId)?.record.archived).toBe(true);
    expect(defaultAgentId).toBeNull();
    expect(originalAgent.record.archived).toBe(false);
  });

  it('exposes immutable history and uses expected revision for rollback', async () => {
    const revised = { ...AGENT, currentRevisionId: REV2.id, current: REV2, revisions: [REV1, REV2] };
    fetchMock
      .mockResolvedValueOnce(runtime()).mockResolvedValueOnce(json({ agents: [AGENT] }))
      .mockResolvedValueOnce(catalog()).mockResolvedValueOnce(json({ agent: AGENT }))
      .mockResolvedValueOnce(json({ agent: revised })).mockResolvedValueOnce(runtime())
      .mockResolvedValueOnce(json({ agents: [revised] })).mockResolvedValueOnce(catalog())
      .mockResolvedValueOnce(json({ agent: revised })).mockResolvedValueOnce(json({ agent: revised }));
    render(<AgentWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: '恢复此版本' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([path, init]) => path === `/v1/agents/${AGENT.id}/revisions/apply` && init?.method === 'POST')).toBe(true));
    const applyCall = fetchMock.mock.calls.find(([path]) => path === `/v1/agents/${AGENT.id}/revisions/apply`);
    expect(JSON.parse(String(applyCall?.[1]?.body))).toEqual({ revisionId: REV1.id, expectedRevisionId: REV2.id });
  });

  it('compares immutable revision fields and marks changed values', async () => {
    const revised = { ...REV2, instructions: 'Use a shorter style', providerId: 'alternate', modelId: 'fixture/alt' };
    const detailed = { ...AGENT, currentRevisionId: revised.id, current: revised, revisions: [REV1, revised] };
    fetchMock
      .mockResolvedValueOnce(runtime()).mockResolvedValueOnce(json({ agents: [detailed] }))
      .mockResolvedValueOnce(json({ models: [
        { providerId: 'magpie', modelId: 'fixture/model', reference: 'magpie:fixture/model', displayName: 'Fixture model', capabilities: ['chat'] },
        { providerId: 'alternate', modelId: 'fixture/alt', reference: 'alternate:fixture/alt', displayName: 'Alternate model', capabilities: ['chat'] },
      ] }))
      .mockResolvedValueOnce(json({ agent: detailed }))
      .mockResolvedValueOnce(json({ agent: detailed }));

    render(<AgentWorkspace />);
    expect(await screen.findByText('比较两个版本')).toBeTruthy();
    expect(screen.getByText(/名称 ·/).textContent).toBe('名称 · 已变化');
    expect(screen.getByText(/Instructions ·/).textContent).toBe('Instructions · 已变化');
    expect(screen.getByText(/默认模型 ·/).textContent).toBe('默认模型 · 已变化');
    expect(screen.getAllByText('Use a shorter style').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('版本 A'), { target: { value: revised.id } });
    fireEvent.change(screen.getByLabelText('版本 B'), { target: { value: revised.id } });
    expect(screen.getByText('请选择两个不同的版本。')).toBeTruthy();
  });

  it('resets comparison to the new current revision after saving a new version', async () => {
    const revised = { ...REV1, id: 'agr_00000000000000000000000000000002', name: 'Research v2', createdAt: '2026-01-02T00:00:00.000Z' };
    let current = { ...AGENT, revisions: [REV1] };
    fetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (path === '/v1/runtime') return runtime();
      if (path === '/v1/model-catalog') return catalog();
      if (path === '/v1/agents/default') return json({ agent: current });
      if (path === '/v1/agents' && method === 'GET') return json({ agents: [current] });
      if (path === `/v1/agents/${AGENT.id}` && method === 'GET') return json({ agent: current });
      if (path === `/v1/agents/${AGENT.id}` && method === 'PATCH') {
        current = { ...current, currentRevisionId: revised.id, current: revised, revisions: [revised, REV1] };
        return json({ agent: current });
      }
      return json({ error: `unexpected ${method} ${path}` }, 500);
    });

    render(<AgentWorkspace />);
    await screen.findByLabelText('名称');
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: revised.name } });
    fireEvent.click(screen.getByRole('button', { name: '保存新版本' }));

    await screen.findByText('已保存为新的不可变版本。');
    await waitFor(() => {
      expect((screen.getByLabelText('版本 A') as HTMLSelectElement).value).toBe(revised.id);
      expect((screen.getByLabelText('版本 B') as HTMLSelectElement).value).toBe(REV1.id);
      expect(screen.getByText('名称 · 已变化')).toBeTruthy();
    });
  });
});
