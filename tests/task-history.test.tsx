// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskHistoryPanel } from '../src/features/task-history/TaskHistoryPanel.js';

const TASKS = [
  {
    id: 'task_agent', prompt: 'Research the topic', model: 'fixture/model', configurationRevisionId: 'cfg_agent',
    state: 'succeeded', attempt: 1, output: 'agent answer', partialOutput: null, error: null,
    agentId: 'agt_00000000000000000000000000000001', agentRevisionId: 'agr_00000000000000000000000000000001',
    providerId: 'magpie', modelId: 'fixture/model',
  },
  {
    id: 'task_legacy', prompt: 'Legacy task', model: 'legacy/model', configurationRevisionId: 'cfg_legacy',
    state: 'failed', attempt: 2, output: null, partialOutput: null, error: 'fixture failure',
  },
];

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

describe('TaskHistoryPanel', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(json({ tasks: TASKS, activeConfigurationRevisionId: 'cfg_active' }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('loads mixed Agent and legacy tasks and shows the selected task details', async () => {
    render(<TaskHistoryPanel />);

    expect(await screen.findByRole('option', { name: /Research the topic/ })).toBeTruthy();
    expect(screen.getAllByText('Legacy task').length).toBeGreaterThan(0);
    expect(screen.getByText('agent answer')).toBeTruthy();
    expect(screen.getByText('cfg_active')).toBeTruthy();
    expect(screen.getByText(TASKS[0]!.agentRevisionId!)).toBeTruthy();
    expect(screen.getByText('magpie / fixture/model')).toBeTruthy();
  });

  it('filters legacy tasks and then selects an Agent task', async () => {
    render(<TaskHistoryPanel />);
    await screen.findByRole('option', { name: /Research the topic/ });

    fireEvent.change(screen.getByLabelText('Agent'), { target: { value: 'legacy' } });
    expect(screen.queryByText('Research the topic')).toBeNull();
    expect(screen.getAllByText('Legacy task').length).toBeGreaterThan(0);
    expect(screen.getAllByText('旧 Runtime 任务').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Agent'), { target: { value: TASKS[0]!.agentId } });
    fireEvent.click(screen.getByRole('option', { name: /Research the topic/ }));
    expect(screen.getByText('agent answer')).toBeTruthy();
  });

  it('shows an empty filter result and recovers from a load error', async () => {
    render(<TaskHistoryPanel />);
    await screen.findByRole('option', { name: /Research the topic/ });
    fireEvent.change(screen.getByLabelText('状态'), { target: { value: 'cancelled' } });
    expect(screen.getByText('当前筛选条件下没有任务记录。')).toBeTruthy();

    fetchMock.mockResolvedValueOnce(json({ error: 'offline' }, 503));
    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: '重新加载' })).toBeTruthy();
  });

  it('explains a task service outage without calling it a model catalog error', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'upstream unavailable' }, 502));
    render(<TaskHistoryPanel />);

    expect(await screen.findByText('Runtime 上游服务暂不可用')).toBeTruthy();
    expect(screen.queryByText('模型目录暂不可用')).toBeNull();
  });

  it('keeps a selected task while a refreshed list removes it', async () => {
    render(<TaskHistoryPanel />);
    await screen.findByRole('option', { name: /Research the topic/ });
    fetchMock.mockResolvedValueOnce(json({ tasks: [TASKS[1]], activeConfigurationRevisionId: 'cfg_new' }));
    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    await waitFor(() => expect(screen.queryByText('Research the topic')).toBeNull());
    expect(screen.getAllByText('Legacy task').length).toBeGreaterThan(0);
    expect(screen.getByText('cfg_new')).toBeTruthy();
  });
});
