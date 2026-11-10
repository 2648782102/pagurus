import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeWorkItem,
  decideDeliveryReceipt,
  getWorkItem,
  listWorkDeliveryReceipts,
  listWorkEvents,
  listWorkItems,
  reconcileAssignment,
  startWorkItem,
  stopWorkItem,
  supportsDurableWorkContract,
} from '../src/shared/api/work.js';

const digest = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const workItem = {
  version: 2 as const, id: 'work_000000000000000000000001', state: 'open' as const,
  threadId: 'thr_000000000000000000000001', triggerId: 'trg_000000000000000000000001',
  mandateId: 'man_000000000000000000000001', mandateRevision: 1 as const,
};
const deliveryReceipt = {
  version: 2 as const, id: 'dlv_000000000000000000000001', workItemId: workItem.id,
  outboxId: 'obx_000000000000000000000001', status: 'observed' as const,
  destinationDigest: digest, payloadDigest: digest,
};
const detail = {
  version: 2 as const,
  workItem,
  thread: {
    version: 2 as const, id: workItem.threadId, threadKey: 'thread-a', contextOnly: true as const,
    triggerIds: [workItem.triggerId], workItemId: workItem.id,
  },
  mandate: {
    version: 2 as const, id: workItem.mandateId, workItemId: workItem.id, revision: 1 as const,
    scope: ['read-local-fixture'], allowedOperations: ['observe'], capabilitiesDigest: digest,
  },
  assignments: [{
    version: 2 as const, id: 'asg_000000000000000000000001', workItemId: workItem.id, state: 'planned' as const,
    agentRevisionId: 'rev_fixture', configurationRevisionId: 'cfg_fixture', mandateRevision: 1 as const,
    model: { providerId: 'fake', modelId: 'fixture' },
  }],
  outbox: [{
    version: 2 as const, id: deliveryReceipt.outboxId, workItemId: workItem.id,
    assignmentId: 'asg_000000000000000000000001', status: 'pending' as const,
    destinationDigest: digest, payloadDigest: digest,
  }],
  deliveryReceipts: [deliveryReceipt],
};
const events = [{
  version: 2 as const, id: 'evt_000000000001', sequence: 1,
  type: 'work.item_created', workItemId: workItem.id, data: { triggerCount: 1 },
}];

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

describe('version-2 durable work client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => vi.unstubAllGlobals());

  it('uses published GET routes and validates version-2 response shapes', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ version: 2, workItems: [workItem] }))
      .mockResolvedValueOnce(json(detail))
      .mockResolvedValueOnce(json({ version: 2, deliveryReceipts: [deliveryReceipt] }))
      .mockResolvedValueOnce(json({ version: 2, events }));
    expect(await listWorkItems()).toEqual({ version: 2, workItems: [workItem] });
    expect(await getWorkItem(workItem.id)).toEqual(detail);
    expect(await listWorkDeliveryReceipts()).toEqual({ version: 2, deliveryReceipts: [deliveryReceipt] });
    expect(await listWorkEvents()).toEqual({ version: 2, events });
    expect(fetchMock.mock.calls.map(([path, init]) => [path, init?.method ?? 'GET', init?.headers])).toEqual([
      ['/v1/work/items', 'GET', { Accept: 'application/json' }],
      [`/v1/work/items/${workItem.id}`, 'GET', { Accept: 'application/json' }],
      ['/v1/work/delivery-receipts', 'GET', { Accept: 'application/json' }],
      ['/v1/work/events', 'GET', { Accept: 'application/json' }],
    ]);
  });

  it('uses only published control POST routes with exact request bodies', async () => {
    const response = { version: 2, workItem: { ...workItem, state: 'running' } };
    for (let index = 0; index < 5; index += 1) fetchMock.mockResolvedValueOnce(json(response));
    fetchMock.mockResolvedValueOnce(json({ version: 2, events }));
    await startWorkItem(workItem.id, 'open');
    await stopWorkItem(workItem.id, 'running');
    await completeWorkItem(workItem.id, 'running');
    await reconcileAssignment('asg_fixture', 'succeeded');
    await decideDeliveryReceipt('dlv_fixture', 'accepted');
    await listWorkEvents();
    const calls = fetchMock.mock.calls;
    expect(calls[0]).toEqual([
      `/v1/work/items/${workItem.id}/start`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ expectedState: 'open' }) }),
    ]);
    expect(calls[1]).toEqual([
      `/v1/work/items/${workItem.id}/stop`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ expectedState: 'running' }) }),
    ]);
    expect(calls[2]).toEqual([
      `/v1/work/items/${workItem.id}/complete`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ expectedState: 'running' }) }),
    ]);
    expect(calls[3]).toEqual([
      '/v1/work/assignments/asg_fixture/reconcile',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ outcome: 'succeeded' }) }),
    ]);
    expect(calls[4]).toEqual([
      '/v1/work/delivery-receipts/dlv_fixture/decision',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ decision: 'accepted' }) }),
    ]);
    expect(JSON.stringify(calls)).not.toMatch(/\/v1\/work\/triggers|SecretHandle|secretValue|plaintext/i);
  });

  it('rejects malformed versions, states, arrays, and HTTP errors', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ version: 1, workItems: [workItem] }))
      .mockResolvedValueOnce(json({ version: 2, workItems: [{ ...workItem, state: 'ready' }] }))
      .mockResolvedValueOnce(json({ version: 2, workItems: 'bad' }))
      .mockResolvedValueOnce(json(detail))
      .mockResolvedValueOnce(json({ version: 2, events: [{ ...events[0], sequence: '1' }] }))
      .mockResolvedValueOnce(json({ error: 'offline' }, 503));
    await expect(listWorkItems()).rejects.toThrow(/invalid response/);
    await expect(listWorkItems()).rejects.toThrow(/invalid response/);
    await expect(listWorkItems()).rejects.toThrow(/invalid response/);
    expect(await getWorkItem(workItem.id)).toEqual(detail);
    await expect(listWorkEvents()).rejects.toThrow(/invalid response/);
    await expect(listWorkItems()).rejects.toThrow(/HTTP 503/);
  });

  it('gates the workbench on the published capability', () => {
    expect(supportsDurableWorkContract(null)).toBe(false);
    expect(supportsDurableWorkContract({
      name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: ['tasks'],
    })).toBe(false);
    expect(supportsDurableWorkContract({
      name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: ['durable-work-contract'],
    })).toBe(true);
  });
});
