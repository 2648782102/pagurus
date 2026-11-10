// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttentionWorkbenchPanel } from '../src/features/work/AttentionWorkbenchPanel.js';

const digest = 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const runtime = {
  name: 'Conchbase' as const,
  version: '1.0.0',
  state: 'ready' as const,
  capabilities: [
    'durable-work-contract',
    'asynchronous-work-control',
    'local-source-policy',
    'capability-directory',
    'write-only-secret-handles',
  ],
};
const workItem = {
  version: 2 as const, id: 'work_000000000000000000000001', state: 'open' as const,
  threadId: 'thr_000000000000000000000001', triggerId: 'trg_000000000000000000000001',
  mandateId: 'man_000000000000000000000001', mandateRevision: 1 as const,
};
const detail = {
  version: 2 as const,
  workItem,
  thread: {
    version: 2 as const, id: workItem.threadId, threadKey: 'thread-a', contextOnly: true as const,
    triggerIds: [workItem.triggerId, 'trg_000000000000000000000002'], workItemId: workItem.id,
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
    version: 2 as const, id: 'obx_000000000000000000000001', workItemId: workItem.id,
    assignmentId: 'asg_000000000000000000000001', status: 'pending' as const,
    destinationDigest: digest, payloadDigest: digest,
  }],
  deliveryReceipts: [{
    version: 2 as const, id: 'dlv_000000000000000000000001', workItemId: workItem.id,
    outboxId: 'obx_000000000000000000000001', status: 'observed' as const,
    destinationDigest: digest, payloadDigest: digest,
  }],
};
const events = [{
  version: 2 as const, id: 'evt_000000000001', sequence: 1,
  type: 'work.item_created', workItemId: workItem.id, data: { triggerCount: 1 },
}];

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

describe('AttentionWorkbenchPanel', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('shows an unsupported capability state without calling work routes', async () => {
    fetchMock.mockResolvedValue(json({
      name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [],
    }));
    render(<AttentionWorkbenchPanel runtime={{ ...runtime, capabilities: [] }} />);
    expect(await screen.findByText(/未发布/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders version-2 work evidence through published GET routes', async () => {
    fetchMock.mockImplementation((path: string) => {
      if (path === '/v1/work/items') return Promise.resolve(json({ version: 2, workItems: [workItem] }));
      if (path === '/v1/work/delivery-receipts') {
        return Promise.resolve(json({ version: 2, deliveryReceipts: detail.deliveryReceipts }));
      }
      if (path === '/v1/work/events') return Promise.resolve(json({ version: 2, events }));
      if (path.startsWith('/v1/work/items/')) return Promise.resolve(json(detail));
      return Promise.resolve(json({ error: 'unexpected' }, 500));
    });
    render(<AttentionWorkbenchPanel runtime={runtime} />);
    expect(await screen.findByText('thread-a')).toBeTruthy();
    expect(screen.getByText('read-local-fixture')).toBeTruthy();
    expect(screen.getByText('fake/fixture')).toBeTruthy();
    expect(screen.getByText('pending')).toBeTruthy();
    expect(screen.getByText('observed')).toBeTruthy();
    expect(screen.getByText('2 条（仅补上下文）')).toBeTruthy();
    expect(screen.getByRole('button', { name: '启动 / 恢复' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '接受' })).toBeTruthy();
    expect(document.body.textContent).not.toContain('fixture-secret-never-logged');
  });

  it('submits an explicit start control through the published route and refreshes state', async () => {
    fetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (init?.method === 'POST' && path.endsWith('/start')) {
        return Promise.resolve(json({ version: 2, workItem: { ...workItem, state: 'running' } }));
      }
      if (path === '/v1/work/items') return Promise.resolve(json({ version: 2, workItems: [{ ...workItem, state: 'running' }] }));
      if (path === '/v1/work/delivery-receipts') {
        return Promise.resolve(json({ version: 2, deliveryReceipts: detail.deliveryReceipts }));
      }
      if (path === '/v1/work/events') return Promise.resolve(json({ version: 2, events }));
      if (path.startsWith('/v1/work/items/')) return Promise.resolve(json(detail));
      return Promise.resolve(json({ error: 'unexpected' }, 500));
    });
    render(<AttentionWorkbenchPanel runtime={runtime} />);
    const start = await screen.findByRole('button', { name: '启动 / 恢复' });
    fireEvent.click(start);
    await waitFor(() => expect(fetchMock.mock.calls.some(([path, init]) =>
      path === `/v1/work/items/${workItem.id}/start` && init?.method === 'POST')).toBe(true));
    expect(await screen.findByText('工作项已启动')).toBeTruthy();
    expect(screen.getAllByText('running').length).toBeGreaterThan(0);
  });

  it('shows the offline error and keeps an explicit refresh action', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<AttentionWorkbenchPanel runtime={runtime} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: '重新加载' })).toBeTruthy();
  });

  it('disables work and Source controls when their capabilities are absent', async () => {
    fetchMock.mockImplementation((path: string) => {
      if (path === '/v1/work/items') return Promise.resolve(json({ version: 2, workItems: [workItem] }));
      if (path === '/v1/work/delivery-receipts') {
        return Promise.resolve(json({ version: 2, deliveryReceipts: detail.deliveryReceipts }));
      }
      if (path === '/v1/work/events') return Promise.resolve(json({ version: 2, events }));
      if (path.startsWith('/v1/work/items/')) return Promise.resolve(json(detail));
      return Promise.resolve(json({ error: 'unexpected' }, 500));
    });
    render(<AttentionWorkbenchPanel runtime={{ ...runtime, capabilities: ['durable-work-contract'] }} />);
    expect(await screen.findByText(/相应控制已禁用/)).toBeTruthy();
    expect((screen.getByRole('button', { name: '启动 / 恢复' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '允许本地事件' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '接受' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
