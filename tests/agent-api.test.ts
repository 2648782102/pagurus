import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyAgentRevision,
  archiveAgent,
  createAgent,
  duplicateAgent,
  getAgent,
  getDefaultAgent,
  listAgents,
  listProviderModels,
  setDefaultAgent,
  supportsAgentManagement,
  updateAgent,
} from '../src/shared/api/agents.js';

const REVISION = {
  id: 'agr_00000000000000000000000000000001',
  name: 'Research',
  instructions: 'Be precise',
  providerId: 'magpie',
  modelId: 'fixture/model',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const AGENT = {
  id: 'agt_00000000000000000000000000000001',
  currentRevisionId: REVISION.id,
  archived: false,
  isDefault: true,
  current: REVISION,
  revisions: [REVISION],
};

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

describe('Agent API client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('checks capabilities before Agent routes are used', async () => {
    fetchMock.mockResolvedValue(response({
      name: 'Conchbase', version: '0.8.0', state: 'ready',
      capabilities: ['agents', 'provider-neutral-model-catalog'],
    }));
    await expect(supportsAgentManagement()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/v1/runtime', expect.any(Object));
  });

  it('reads Agent collection, detail, default, and provider-neutral model catalog', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ agents: [AGENT] }))
      .mockResolvedValueOnce(response({ agent: AGENT }))
      .mockResolvedValueOnce(response({ agent: AGENT }))
      .mockResolvedValueOnce(response({ models: [{
        providerId: 'magpie', modelId: 'fixture/model', reference: 'magpie:fixture/model',
        displayName: 'Fixture', capabilities: ['chat'],
      }] }));
    await expect(listAgents()).resolves.toEqual([AGENT]);
    await expect(getAgent(AGENT.id)).resolves.toEqual(AGENT);
    await expect(getDefaultAgent()).resolves.toEqual(AGENT);
    await expect(listProviderModels()).resolves.toMatchObject([{ providerId: 'magpie', modelId: 'fixture/model' }]);
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/v1/agents', `/v1/agents/${AGENT.id}`, '/v1/agents/default', '/v1/model-catalog',
    ]);
  });

  it('writes only accepted resource operations with optimistic revision ids', async () => {
    const profile = { name: 'Research', instructions: 'Be precise', providerId: 'magpie', modelId: 'fixture/model' };
    fetchMock
      .mockResolvedValueOnce(response({ agent: AGENT }, 201))
      .mockResolvedValueOnce(response({ agent: AGENT }))
      .mockResolvedValueOnce(response({ agent: AGENT }, 201))
      .mockResolvedValueOnce(response({ agent: { ...AGENT, archived: true } }))
      .mockResolvedValueOnce(response({ agent: AGENT }))
      .mockResolvedValueOnce(response({ agent: AGENT }));
    await createAgent(profile);
    await updateAgent(AGENT.id, REVISION.id, profile);
    await duplicateAgent(AGENT.id);
    await archiveAgent(AGENT.id);
    await setDefaultAgent(AGENT.id);
    await applyAgentRevision(AGENT.id, REVISION.id, REVISION.id);
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/v1/agents', `/v1/agents/${AGENT.id}`, `/v1/agents/${AGENT.id}/duplicate`,
      `/v1/agents/${AGENT.id}/archive`, '/v1/agents/default', `/v1/agents/${AGENT.id}/revisions/apply`,
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ expectedRevisionId: REVISION.id, profile });
    expect(JSON.parse(String(fetchMock.mock.calls[4]?.[1]?.body))).toEqual({ agentId: AGENT.id });
  });

  it('maps stale writes and rejects malformed envelopes', async () => {
    fetchMock.mockResolvedValueOnce(response({ error: 'stale' }, 409));
    await expect(setDefaultAgent(AGENT.id)).rejects.toThrow('Agent 已被其他操作更新');
    fetchMock.mockResolvedValueOnce(response({ agents: [{ id: 'bad' }] }));
    await expect(listAgents()).rejects.toThrow('不符合契约');
  });
});
