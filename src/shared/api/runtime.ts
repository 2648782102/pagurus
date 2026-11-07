export interface RuntimeHealth {
  status: 'ok';
  service: 'conchbase';
  apiVersion: 1;
}

export interface RuntimeInfo {
  name: 'Conchbase';
  version: string;
  state: 'ready';
  capabilities: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRuntimeHealth(value: unknown): value is RuntimeHealth {
  if (!isRecord(value)) return false;
  const health = value;
  return health.status === 'ok'
    && health.service === 'conchbase'
    && health.apiVersion === 1;
}

function isRuntimeInfo(value: unknown): value is RuntimeInfo {
  if (!isRecord(value)) return false;
  return value.name === 'Conchbase'
    && typeof value.version === 'string'
    && value.state === 'ready'
    && Array.isArray(value.capabilities)
    && value.capabilities.every((capability) => typeof capability === 'string');
}

async function getJson<T>(
  path: string,
  isPayload: (value: unknown) => value is T,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Runtime returned HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isPayload(payload)) {
    throw new Error(`Runtime returned an invalid response from ${path}`);
  }

  return payload;
}

export function getRuntimeHealth(signal?: AbortSignal): Promise<RuntimeHealth> {
  return getJson('/v1/health', isRuntimeHealth, signal);
}

export function getRuntimeInfo(signal?: AbortSignal): Promise<RuntimeInfo> {
  return getJson('/v1/runtime', isRuntimeInfo, signal);
}
