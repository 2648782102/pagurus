export type TaskState =
  | 'queued'
  | 'running'
  | 'cancelling'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'interrupted'
  | 'waiting_approval';

export interface Task {
  id: string;
  prompt: string;
  model: string;
  configurationRevisionId: string;
  state: TaskState;
  attempt: number;
  output: string | null;
  partialOutput: string | null;
  error: string | null;
  agentId?: string;
  agentRevisionId?: string;
  providerId?: string;
  modelId?: string;
}

export interface ModelCatalogEntry {
  id: string;
  displayName: string;
}

const TASK_STATES: readonly TaskState[] = [
  'queued',
  'running',
  'cancelling',
  'succeeded',
  'failed',
  'cancelled',
  'interrupted',
  'waiting_approval',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.prompt === 'string'
    && typeof value.model === 'string'
    && typeof value.configurationRevisionId === 'string'
    && TASK_STATES.includes(value.state as TaskState)
    && typeof value.attempt === 'number'
    && (typeof value.output === 'string' || value.output === null)
    && (typeof value.partialOutput === 'string' || value.partialOutput === null)
    && (typeof value.error === 'string' || value.error === null)
    && (value.agentId === undefined || typeof value.agentId === 'string')
    && (value.agentRevisionId === undefined || typeof value.agentRevisionId === 'string')
    && (value.providerId === undefined || typeof value.providerId === 'string')
    && (value.modelId === undefined || typeof value.modelId === 'string');
}

function isTaskEnvelope(value: unknown): value is { task: Task } {
  return isRecord(value) && isTask(value.task);
}

function isRetryEnvelope(value: unknown): value is { task: Task; retried: true } {
  return isRecord(value) && isTask(value.task) && value.retried === true;
}

function isModelCatalog(value: unknown): value is { models: ModelCatalogEntry[] } {
  if (!isRecord(value) || !Array.isArray(value.models)) return false;
  return value.models.every((entry) => isRecord(entry)
    && typeof entry.id === 'string'
    && typeof entry.displayName === 'string');
}

async function request<T>(
  path: string,
  isPayload: (value: unknown) => value is T,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      Accept: 'application/json',
    },
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error('请求不符合 Runtime API 契约');
    }
    if (response.status === 404) {
      throw new Error('任务不存在');
    }
    if (response.status === 409) {
      throw new Error('任务当前状态不支持这个操作');
    }
    if (response.status === 502) {
      throw new Error('模型目录暂不可用');
    }
    if (response.status === 503) {
      throw new Error('Runtime 任务服务未就绪');
    }
    throw new Error(`Runtime 返回 HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isPayload(payload)) {
    throw new Error(`Runtime 返回了不符合契约的数据：${path}`);
  }
  return payload;
}

function postJson(body?: unknown, signal?: AbortSignal): RequestInit {
  return {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(signal ? { signal } : {}),
  };
}

export async function listModels(signal?: AbortSignal): Promise<ModelCatalogEntry[]> {
  const payload = await request('/v1/models', isModelCatalog, { signal }, signal);
  return payload.models;
}

export async function createTask(
  input: { prompt: string; model: string } | { prompt: string; agentId: string; modelOverride?: { providerId: string; modelId: string } },
  signal?: AbortSignal,
): Promise<Task> {
  const payload = await request(
    '/v1/tasks',
    isTaskEnvelope,
    postJson(input, signal),
    signal,
  );
  return payload.task;
}

export async function getTask(taskId: string, signal?: AbortSignal): Promise<Task> {
  const payload = await request(
    `/v1/tasks/${encodeURIComponent(taskId)}`,
    isTaskEnvelope,
    { signal },
    signal,
  );
  return payload.task;
}

export async function cancelTask(taskId: string, signal?: AbortSignal): Promise<Task> {
  const payload = await request(
    `/v1/tasks/${encodeURIComponent(taskId)}/cancel`,
    isTaskEnvelope,
    postJson(undefined, signal),
    signal,
  );
  return payload.task;
}

export async function retryTask(taskId: string, signal?: AbortSignal): Promise<Task> {
  const payload = await request(
    `/v1/tasks/${encodeURIComponent(taskId)}/retry`,
    isRetryEnvelope,
    postJson(undefined, signal),
    signal,
  );
  return payload.task;
}
