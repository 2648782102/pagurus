// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskOperationsPanel } from '../src/features/task-operations/TaskOperationsPanel.js';

const TASK = {
  id: 'task_fixture',
  prompt: 'hello',
  model: 'fixture/model',
  configurationRevisionId: 'cfg_fixture',
  state: 'queued',
  attempt: 1,
  output: null,
  partialOutput: null,
  error: null,
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

describe('TaskOperationsPanel', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('loads models, starts a task, and shows its final output', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ models: [{ id: 'fixture/model', displayName: 'Fixture' }] }))
      .mockResolvedValueOnce(json({ task: TASK }, 202))
      .mockResolvedValue(json({ task: { ...TASK, state: 'succeeded', output: 'answer' } }));

    render(<TaskOperationsPanel />);
    const model = await screen.findByLabelText('模型');
    expect((model as HTMLSelectElement).value).toBe('fixture/model');

    fireEvent.change(screen.getByLabelText('任务内容'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: '开始任务' }));

    expect(await screen.findByText('answer')).toBeTruthy();
    expect(screen.getByText('已完成')).toBeTruthy();
    expect(screen.getByRole('button', { name: '显式重试' })).toBeTruthy();
  });

  it('shows a recoverable model-catalog error without pretending configuration works', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'unavailable' }, 502));

    render(<TaskOperationsPanel />);

    expect(await screen.findByText('模型目录暂不可用')).toBeTruthy();
    expect(screen.getByRole('button', { name: '重新加载模型' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '开始任务' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/配置 Agents、MCP、Skills 和插件的界面仍在规划中/)).toBeTruthy();
  });

  it('shows streaming progress while active and prefers final output on completion', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ models: [{ id: 'fixture/model', displayName: 'Fixture' }] }))
      .mockResolvedValueOnce(json({ task: TASK }, 202))
      .mockResolvedValueOnce(json({
        task: { ...TASK, state: 'running', partialOutput: 'draft answer' },
      }))
      .mockResolvedValue(json({
        task: {
          ...TASK,
          state: 'succeeded',
          output: 'final answer',
          partialOutput: 'stale draft',
        },
      }));

    render(<TaskOperationsPanel />);
    await screen.findByLabelText('模型');
    fireEvent.change(screen.getByLabelText('任务内容'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: '开始任务' }));

    expect(await screen.findByText('draft answer')).toBeTruthy();
    expect(screen.getByText('实时输出中…')).toBeTruthy();
    expect(await screen.findByText('final answer')).toBeTruthy();
    expect(screen.queryByText('stale draft')).toBeNull();
    expect(screen.queryByText('实时输出中…')).toBeNull();
  });

  it('keeps cancel and retry keyboard accessible with labels', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ models: [{ id: 'fixture/model', displayName: 'Fixture' }] }))
      .mockResolvedValueOnce(json({ task: TASK }, 202))
      .mockResolvedValueOnce(json({ task: { ...TASK, state: 'cancelling' } }))
      .mockResolvedValue(json({ task: { ...TASK, state: 'cancelled' } }));

    render(<TaskOperationsPanel />);
    await screen.findByLabelText('模型');
    fireEvent.change(screen.getByLabelText('任务内容'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: '开始任务' }));
    const cancel = await screen.findByRole('button', { name: '取消任务' });
    fireEvent.click(cancel);

    await waitFor(() => expect(screen.getByRole('button', { name: '显式重试' })).toBeTruthy());
    expect(screen.getByText('已取消')).toBeTruthy();
  });
});
