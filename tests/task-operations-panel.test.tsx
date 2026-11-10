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
const RUNTIME = { name: 'Conchbase', version: '0.8.0', state: 'ready', capabilities: ['agents', 'provider-neutral-model-catalog'] };
const REVISION = {
  id: 'agr_00000000000000000000000000000001',
  name: 'Research', instructions: '', providerId: 'magpie', modelId: 'fixture/model', createdAt: '2026-01-01T00:00:00.000Z',
};
const AGENT = { id: 'agt_00000000000000000000000000000001', currentRevisionId: REVISION.id, archived: false, isDefault: true, current: REVISION };

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

function legacyRuntime(): Response {
  return json({ name: 'Conchbase', version: '0.7.0', state: 'ready', capabilities: ['tasks'] });
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
      .mockResolvedValueOnce(legacyRuntime())
      .mockResolvedValueOnce(json({ models: [{ id: 'fixture/model', displayName: 'Fixture' }] }))
      .mockResolvedValueOnce(json({ task: TASK }, 202))
      .mockResolvedValue(json({ task: { ...TASK, state: 'succeeded', output: 'answer' } }));

    render(<TaskOperationsPanel />);
    const model = await screen.findByLabelText('模型');
    expect((model as HTMLSelectElement).value).toBe('magpie:fixture/model');

    fireEvent.change(screen.getByLabelText('任务内容'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: '开始任务' }));

    expect(await screen.findByText('answer')).toBeTruthy();
    expect(screen.getByText('已完成')).toBeTruthy();
    expect(screen.getByRole('button', { name: '显式重试' })).toBeTruthy();
  });

  it('shows a recoverable model-catalog error without pretending configuration works', async () => {
    fetchMock.mockResolvedValueOnce(legacyRuntime()).mockResolvedValueOnce(json({ error: 'unavailable' }, 502));

    render(<TaskOperationsPanel />);

    expect(await screen.findByText('模型目录暂不可用')).toBeTruthy();
    expect(screen.getByRole('button', { name: '重新加载模型' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '开始任务' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/旧 Runtime 继续使用兼容任务模式/)).toBeTruthy();
  });

  it('shows streaming progress while active and prefers final output on completion', async () => {
    fetchMock
      .mockResolvedValueOnce(legacyRuntime())
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
      .mockResolvedValueOnce(legacyRuntime())
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

  it('creates a pinned Agent task and shows both revisions and effective model', async () => {
    fetchMock
      .mockImplementationOnce(() => Promise.resolve(json(RUNTIME)))
      .mockImplementationOnce(() => Promise.resolve(json({ models: [
        { providerId: 'magpie', modelId: 'fixture/model', reference: 'magpie:fixture/model', displayName: 'Fixture', capabilities: ['chat'] },
        { providerId: 'alternate', modelId: 'fixture/alt', reference: 'alternate:fixture/alt', displayName: 'Alternate', capabilities: ['chat'] },
      ] })))
      .mockImplementationOnce(() => Promise.resolve(json({ agents: [AGENT] })))
      .mockImplementationOnce(() => Promise.resolve(json({ agent: AGENT })))
      .mockImplementationOnce(() => Promise.resolve(json({ task: {
        ...TASK, agentId: AGENT.id, agentRevisionId: REVISION.id, providerId: 'alternate', modelId: 'fixture/alt',
      } }, 202)))
      .mockImplementation((path: string) => String(path).includes('/v1/agents/')
        ? Promise.resolve(json({ agent: { ...AGENT, revisions: [REVISION] } }))
        : Promise.resolve(json({ task: {
          ...TASK, state: 'succeeded', output: 'bound output', agentId: AGENT.id,
          agentRevisionId: REVISION.id, providerId: 'alternate', modelId: 'fixture/alt',
        } })));

    render(<TaskOperationsPanel />);
    await screen.findByLabelText('Agent');
    fireEvent.change(screen.getByLabelText('Agent'), { target: { value: AGENT.id } });
    fireEvent.change(screen.getByLabelText('本次使用模型'), { target: { value: 'alternate:fixture/alt' } });
    fireEvent.change(screen.getByLabelText('任务内容'), { target: { value: 'hello agent' } });
    fireEvent.click(screen.getByRole('button', { name: '开始任务' }));

    expect(await screen.findByText('bound output')).toBeTruthy();
    expect(screen.getByText(REVISION.id)).toBeTruthy();
    expect(screen.getByText(TASK.configurationRevisionId)).toBeTruthy();
    expect(screen.getByText('alternate / fixture/alt')).toBeTruthy();
    const createCall = fetchMock.mock.calls.find(([path, init]) => path === '/v1/tasks' && init?.method === 'POST');
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      prompt: 'hello agent', agentId: AGENT.id,
      modelOverride: { providerId: 'alternate', modelId: 'fixture/alt' },
    });
  });

  it('disables launch when Agent mode has no available Agent', async () => {
    fetchMock
      .mockResolvedValueOnce(json(RUNTIME))
      .mockResolvedValueOnce(json({ models: [
        { providerId: 'magpie', modelId: 'fixture/model', reference: 'magpie:fixture/model', displayName: 'Fixture', capabilities: ['chat'] },
      ] }))
      .mockResolvedValueOnce(json({ agents: [] }))
      .mockResolvedValueOnce(json({ agent: null }));

    render(<TaskOperationsPanel />);
    await screen.findByLabelText('Agent');
    expect((screen.getByRole('button', { name: '开始任务' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('requires explicit Agent selection even when the Runtime has a default', async () => {
    fetchMock
      .mockResolvedValueOnce(json(RUNTIME))
      .mockResolvedValueOnce(json({ models: [
        { providerId: 'magpie', modelId: 'fixture/model', reference: 'magpie:fixture/model', displayName: 'Fixture', capabilities: ['chat'] },
      ] }))
      .mockResolvedValueOnce(json({ agents: [AGENT] }))
      .mockResolvedValueOnce(json({ agent: AGENT }));

    render(<TaskOperationsPanel />);
    await screen.findByLabelText('Agent');
    expect((screen.getByLabelText('Agent') as HTMLSelectElement).value).toBe('');
    expect((screen.getByRole('button', { name: '开始任务' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('reloads Agent choices when the parent reports an Agent change', async () => {
    const revisedAgent = { ...AGENT, current: { ...REVISION, name: 'Writer' } };
    const secondAgent = {
      ...AGENT,
      id: 'agt_00000000000000000000000000000002',
      isDefault: false,
      current: { ...REVISION, name: 'Second', modelId: 'fixture/alt' },
    };
    fetchMock
      .mockResolvedValueOnce(json(RUNTIME))
      .mockResolvedValueOnce(json({ models: [
        { providerId: 'magpie', modelId: 'fixture/model', reference: 'magpie:fixture/model', displayName: 'Fixture', capabilities: ['chat'] },
        { providerId: 'magpie', modelId: 'fixture/alt', reference: 'magpie:fixture/alt', displayName: 'Alternate', capabilities: ['chat'] },
      ] }))
      .mockResolvedValueOnce(json({ agents: [revisedAgent, secondAgent] }))
      .mockResolvedValueOnce(json({ agent: revisedAgent }))
      .mockResolvedValueOnce(json(RUNTIME))
      .mockResolvedValueOnce(json({ models: [
        { providerId: 'magpie', modelId: 'fixture/model', reference: 'magpie:fixture/model', displayName: 'Fixture', capabilities: ['chat'] },
        { providerId: 'magpie', modelId: 'fixture/alt', reference: 'magpie:fixture/alt', displayName: 'Alternate', capabilities: ['chat'] },
      ] }))
      .mockResolvedValueOnce(json({ agents: [revisedAgent, secondAgent] }))
      .mockResolvedValueOnce(json({ agent: revisedAgent }));

    const { rerender } = render(<TaskOperationsPanel agentRefreshToken={0} />);
    await screen.findByRole('option', { name: /Second/ });
    fireEvent.change(screen.getByLabelText('Agent'), { target: { value: secondAgent.id } });
    expect((screen.getByLabelText('本次使用模型') as HTMLSelectElement).value).toBe('magpie:fixture/alt');
    rerender(<TaskOperationsPanel agentRefreshToken={1} />);

    expect(await screen.findByRole('option', { name: /Writer/ })).toBeTruthy();
    expect((screen.getByLabelText('Agent') as HTMLSelectElement).value).toBe(secondAgent.id);
    expect((screen.getByLabelText('本次使用模型') as HTMLSelectElement).value).toBe('magpie:fixture/alt');
    expect((screen.getByRole('button', { name: '开始任务' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
