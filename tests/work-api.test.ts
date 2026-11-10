import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getWorkItem,
  listWorkDeliveryReceipts,
  listWorkItems,
  supportsDurableWorkContract,
} from '../src/shared/api/work.js';

const digest = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const workItem = {
  version: 1, id: 'work_000000000000000000000001', state: 'open',
  threadId: 'thr_000000000000000000000001', triggerId: 'trg_000000000000000000000001',
  mandateId: 'man_000000000000000000000001', mandateRevision: 1,
};
const deliveryReceipt = {
  version: 1, id: 'dlv_000000000000000000000001', workItemId: workItem.id,
  outboxId: 'obx_000000000000000000000001', status: 'observed',
  destinationDigest: digest, payloadDigest: digest,
};
const detail = {
  version: 1,
  workItem,
  thread: {
    version: 1, id: workItem.threadId, threadKey: 'thread-a', contextOnly: true,
    triggerIds: [workItem.triggerId], workItemId: workItem.id,
  },
  mandate: {
    version: 1, id: workItem.mandateId, workItemId: workItem.id, revision: 1,
    scope: ['read-local-fixture'], allowedOperations: ['observe'], capabilitiesDigest: digest,
  },
  assignments: [{
    version: 1, id: 'asg_000000000000000000000001', workItemId: workItem.id, state: 'planned',
    agentRevisionId: 'rev_fixture', configurationRevisionId: 'cfg_fixture', mandateRevision: 1,
    model: { providerId: 'fake', modelId: 'fixture' },
  }],
  outbox: [{
    version: 1, id: deliveryReceipt.outboxId, workItemId: workItem.id,
    assignmentId: 'asg_000000000000000000000001', status: 'pending',
    destinationDigest: digest, payloadDigest: digest,
  }],
  deliveryReceipts: [deliveryReceipt],
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

describe('read-only durable work client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => vi.unstubAllGlobals());

  it('uses only published GET routes and validates response shapes', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ version: 1, workItems: [workItem] }))
      .mockResolvedValueOnce(json(detail))
      .mockResolvedValueOnce(json({ version: 1, deliveryReceipts: [deliveryReceipt] }));
    expect(await listWorkItems()).toEqual({ version: 1, workItems: [workItem] });
    expect(await getWorkItem(workItem.id)).toEqual(detail);
    expect(await listWorkDeliveryReceipts()).toEqual({ version: 1, deliveryReceipts: [deliveryReceipt] });
    expect(fetchMock.mock.calls.map(([path, init]) => [path, init?.method ?? 'GET', init?.headers])).toEqual([
      ['/v1/work/items', 'GET', { Accept: 'application/json' }],
      [`/v1/work/items/${workItem.id}`, 'GET', { Accept: 'application/json' }],
      ['/v1/work/delivery-receipts', 'GET', { Accept: 'application/json' }],
    ]);
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/POST|PUT|PATCH|DELETE|SecretHandle|secretValue|plaintext/i);
  });

  it('rejects malformed versions, states, arrays, and HTTP errors', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ version: 2, workItems: [workItem] }))
      .mockResolvedValueOnce(json({ version: 1, workItems: [{ ...workItem, state: 'ready' }] }))
      .mockResolvedValueOnce(json({ version: 1, workItems: 'bad' }))
      .mockResolvedValueOnce(json(detail))
      .mockResolvedValueOnce(json({ version: 1, deliveryReceipts: 'bad' }))
      .mockResolvedValueOnce(json({ error: 'not found' }, 503));
    await expect(listWorkItems()).rejects.toThrow(/invalid response/);
    await expect(listWorkItems()).rejects.toThrow(/invalid response/);
    await expect(listWorkItems()).rejects.toThrow(/invalid response/);
    expect(await getWorkItem(workItem.id)).toEqual(detail);
    await expect(listWorkDeliveryReceipts()).rejects.toThrow(/invalid response/);
    await expect(listWorkDeliveryReceipts()).rejects.toThrow(/HTTP 503/);
  });

  it('gates the workbench on the published capability', () => {
    expect(supportsDurableWorkContract(null)).toBe(false);
    expect(supportsDurableWorkContract({
      name: 'Conchbase', version: '0.9.0', state: 'ready', capabilities: ['tasks'],
    })).toBe(false);
    expect(supportsDurableWorkContract({
      name: 'Conchbase', version: '0.9.0', state: 'ready', capabilities: ['durable-work-contract'],
    })).toBe(true);
  });
});
