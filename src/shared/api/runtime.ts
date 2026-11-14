import { UnsupportedRuntimeApiError } from './errors.js';

export interface RuntimeHealth {
  status: 'ok';
  service: 'conchbase';
  apiVersion: number;
}

export const SUPPORTED_RUNTIME_API_VERSION = 1;

export interface RuntimeInfo {
  name: 'Conchbase';
  version: string;
  state: 'ready';
  capabilities: string[];
  organizationContract?: '1.1.0';
  organizationPaths?: number;
  executionContract?: '1.2.0';
  executionPaths?: number;
  executionRunContract?: '1.3.0';
  executionRunPaths?: number;
  conversationContract?: '1.4.0';
  conversationPaths?: number;
}

export function hasRuntimeCapability(runtime: RuntimeInfo | null, capability: string): boolean {
  return runtime?.capabilities.includes(capability) ?? false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRuntimeHealth(value: unknown): value is RuntimeHealth {
  if (!isRecord(value)) return false;
  const health = value;
  return health.status === 'ok'
    && health.service === 'conchbase'
    && typeof health.apiVersion === 'number';
}

function isRuntimeInfo(value: unknown): value is RuntimeInfo {
  if (!isRecord(value)) return false;
  return value.name === 'Conchbase'
    && typeof value.version === 'string'
    && value.state === 'ready'
    && Array.isArray(value.capabilities)
    && value.capabilities.every((capability) => typeof capability === 'string')
    && (value.organizationContract === undefined || value.organizationContract === '1.1.0')
    && (value.organizationPaths === undefined || Number.isInteger(value.organizationPaths))
    && (value.executionContract === undefined || value.executionContract === '1.2.0')
    && (value.executionPaths === undefined || Number.isInteger(value.executionPaths))
    && (value.executionRunContract === undefined || value.executionRunContract === '1.3.0')
    && (value.executionRunPaths === undefined || Number.isInteger(value.executionRunPaths))
    && (value.conversationContract === undefined || value.conversationContract === '1.4.0')
    && (value.conversationPaths === undefined || Number.isInteger(value.conversationPaths));
}

export async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    ...(init ?? {}),
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Runtime returned HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  return payload as T;
}

async function getJson<T>(
  path: string,
  isPayload: (value: unknown) => value is T,
  signal?: AbortSignal,
): Promise<T> {
  const payload: unknown = await fetchJson<unknown>(path, undefined, signal);
  if (!isPayload(payload)) {
    throw new Error(`Runtime returned an invalid response from ${path}`);
  }
  return payload;
}

export function getRuntimeHealth(signal?: AbortSignal): Promise<RuntimeHealth> {
  return getJson('/v1/health', isRuntimeHealth, signal).then((health) => {
    if (health.apiVersion !== SUPPORTED_RUNTIME_API_VERSION) {
      throw new UnsupportedRuntimeApiError(
        '/v1/health',
        SUPPORTED_RUNTIME_API_VERSION,
      );
    }
    return health;
  });
}

export function getRuntimeInfo(signal?: AbortSignal): Promise<RuntimeInfo> {
  return getJson('/v1/runtime', isRuntimeInfo, signal);
}
