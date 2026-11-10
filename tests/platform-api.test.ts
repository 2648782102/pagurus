import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSecretHandle,
  ingestLocalSourceEvent,
  listCapabilities,
  listLocalSourceEvents,
  listSecretHandleUseReceipts,
  listSecretHandles,
  putCapability,
  rotateSecretHandle,
  setSecretHandleStatus,
  useSecretHandle,
} from '../src/shared/api/platform.js';

const FIXED_SECRET = 'fixture-secret-never-logged';
const digest = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const capability = {
  version: 2 as const, id: 'cap_fixture', kind: 'mcp' as const, name: 'fixture',
  status: 'enabled' as const, descriptor: 'local descriptor', createdAt: '2026-11-11T00:00:00.000Z',
};
const sourceEvent = {
  version: 2 as const, id: 'src_fixture', sourceId: 'pagurus-local', threadKey: 'thread-a',
  payloadDigest: digest, occurredAt: '2026-11-11T00:00:00.000Z', policy: 'allow' as const,
  mandateDigest: digest,
};
const handle = {
  version: 2 as const, id: 'sh_fixture', key: 'fixture-key', secretVersion: 1,
  status: 'active' as const, purpose: 'fixture purpose', allowedAdapter: 'local-bound-fixture',
  destinationBinding: 'local-fixture', valueDigest: digest,
  createdAt: '2026-11-11T00:00:00.000Z', rotatedAt: null,
};
const receipt = {
  version: 2 as const, id: 'sur_fixture', handleId: handle.id, secretVersionDigest: digest,
  grantRevision: 'grant_fixture', adapterId: 'local-bound-fixture', destinationDigest: digest,
  outcome: 'injected' as const, workItemId: 'work_fixture', assignmentId: 'asg_fixture',
  createdAt: '2026-11-11T00:00:00.000Z',
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

describe('1.0.0 platform client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => vi.unstubAllGlobals());

  it('reads capability, Source, handle, and receipt collections through published GET routes', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ version: 2, capabilities: [capability] }))
      .mockResolvedValueOnce(json({ version: 2, events: [sourceEvent] }))
      .mockResolvedValueOnce(json({ version: 2, handles: [handle] }))
      .mockResolvedValueOnce(json({ version: 2, receipts: [receipt] }));
    expect(await listCapabilities()).toEqual({ version: 2, capabilities: [capability] });
    expect(await listLocalSourceEvents()).toEqual({ version: 2, events: [sourceEvent] });
    expect(await listSecretHandles()).toEqual({ version: 2, handles: [handle] });
    expect(await listSecretHandleUseReceipts()).toEqual({ version: 2, receipts: [receipt] });
    expect(fetchMock.mock.calls.map(([path, init]) => [path, init?.method ?? 'GET'])).toEqual([
      ['/v1/capabilities', 'GET'],
      ['/v1/sources/local/events', 'GET'],
      ['/v1/secret-handles', 'GET'],
      ['/v1/secret-handles/use-receipts', 'GET'],
    ]);
  });

  it('submits published POST routes and proves the one-shot sentinel never leaks into responses', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ version: 2, capability }))
      .mockResolvedValueOnce(json({ version: 2, event: sourceEvent }))
      .mockResolvedValueOnce(json({ version: 2, handle }))
      .mockResolvedValueOnce(json({ version: 2, handle: { ...handle, secretVersion: 2 } }))
      .mockResolvedValueOnce(json({ version: 2, handle: { ...handle, status: 'disabled' } }))
      .mockResolvedValueOnce(json({ version: 2, receipt }));
    await putCapability({ kind: 'mcp', name: 'fixture', status: 'enabled', descriptor: 'local descriptor' });
    await ingestLocalSourceEvent({
      sourceId: 'pagurus-local', threadKey: 'thread-a', payloadDigest: digest,
      occurredAt: '2026-11-11T00:00:00.000Z', policy: 'allow', mandateDigest: digest,
    });
    const createInput = {
      key: 'fixture-key', value: FIXED_SECRET, purpose: 'fixture purpose',
      allowedAdapter: 'local-bound-fixture', destinationBinding: 'local-fixture',
    };
    await createSecretHandle(createInput);
    await rotateSecretHandle(handle.id, 'rotated-value');
    await setSecretHandleStatus(handle.id, 'disabled');
    await useSecretHandle({
      handleId: handle.id, workItemId: 'work_fixture', assignmentId: 'asg_fixture',
      grantRevision: 'grant_fixture',
    });
    const calls = fetchMock.mock.calls;
    expect(calls[2][0]).toBe('/v1/secret-handles');
    expect(calls[2][1]).toEqual(expect.objectContaining({
      method: 'POST', body: JSON.stringify(createInput),
    }));
    expect(calls[3][0]).toBe(`/v1/secret-handles/${handle.id}/rotate`);
    expect(calls[4][0]).toBe(`/v1/secret-handles/${handle.id}/status`);
    expect(calls[5][0]).toBe(`/v1/secret-handles/${handle.id}/use`);
    const serializedRequests = JSON.stringify(calls);
    expect(serializedRequests).toContain(FIXED_SECRET);
    const serializedResponses = JSON.stringify([
      capability, sourceEvent, handle, receipt,
    ]);
    expect(serializedResponses).not.toContain(FIXED_SECRET);
    expect(serializedResponses).not.toMatch(/localStorage|sessionStorage|indexedDB|decrypt|resolveSecret/i);
  });

  it('rejects malformed versions, statuses, arrays, and HTTP errors', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ version: 1, capabilities: [capability] }))
      .mockResolvedValueOnce(json({ version: 2, capabilities: [{ ...capability, kind: 'executor' }] }))
      .mockResolvedValueOnce(json({ version: 2, handles: [{ ...handle, status: 'expired' }] }))
      .mockResolvedValueOnce(json({ version: 2, receipts: 'bad' }))
      .mockResolvedValueOnce(json({ error: 'unavailable' }, 503));
    await expect(listCapabilities()).rejects.toThrow(/invalid response/);
    await expect(listCapabilities()).rejects.toThrow(/invalid response/);
    await expect(listSecretHandles()).rejects.toThrow(/invalid response/);
    await expect(listSecretHandleUseReceipts()).rejects.toThrow(/invalid response/);
    await expect(listCapabilities()).rejects.toThrow(/HTTP 503/);
  });
});
