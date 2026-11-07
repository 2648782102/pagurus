import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelTask,
  createTask,
  getTask,
  listModels,
  retryTask,
} from '../src/shared/api/tasks.js';

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

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

describe('phase-1 task API client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads and validates the model catalog', async () => {
    fetchMock.mockResolvedValue(response({
      models: [{ id: 'fixture/model', displayName: 'Fixture' }],
    }));
    await expect(listModels()).resolves.toEqual([
      { id: 'fixture/model', displayName: 'Fixture' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/v1/models', expect.objectContaining({
      headers: expect.objectContaining({ Accept: 'application/json' }),
    }));
  });

  it('creates a task through the documented POST route', async () => {
    fetchMock.mockResolvedValue(response({ task: TASK }, 202));
    await expect(createTask({ prompt: 'hello', model: 'fixture/model' })).resolves.toEqual(TASK);
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/v1/tasks');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ prompt: 'hello', model: 'fixture/model' });
  });

  it('reads, cancels, and retries a task using the published routes', async () => {
    fetchMock.mockResolvedValueOnce(response({ task: TASK }));
    await expect(getTask('task_fixture')).resolves.toEqual(TASK);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/v1/tasks/task_fixture');

    fetchMock.mockResolvedValueOnce(response({ task: { ...TASK, state: 'cancelling' } }));
    await cancelTask('task_fixture');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/v1/tasks/task_fixture/cancel');

    fetchMock.mockResolvedValueOnce(response({ task: TASK, retried: true }));
    await expect(retryTask('task_fixture')).resolves.toEqual(TASK);
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/v1/tasks/task_fixture/retry');
  });

  it('rejects malformed payloads and translates documented errors', async () => {
    fetchMock.mockResolvedValueOnce(response({ models: [{ id: 42 }] }));
    await expect(listModels()).rejects.toThrow('不符合契约');

    fetchMock.mockResolvedValueOnce(response({ error: 'busy' }, 409));
    await expect(cancelTask('task_fixture')).rejects.toThrow('不支持这个操作');

    fetchMock.mockResolvedValueOnce(response({ error: 'missing' }, 404));
    await expect(getTask('missing')).rejects.toThrow('任务不存在');
  });

  it('validates the streaming progress field', async () => {
    fetchMock.mockResolvedValueOnce(response({
      task: { ...TASK, state: 'running', partialOutput: 'draft' },
    }));
    await expect(getTask('task_fixture')).resolves.toMatchObject({
      state: 'running',
      partialOutput: 'draft',
    });

    fetchMock.mockResolvedValueOnce(response({
      task: { ...TASK, state: 'running', partialOutput: 42 },
    }));
    await expect(getTask('task_fixture')).rejects.toThrow('不符合契约');
  });
});
