import { UnsupportedRuntimeApiError } from './errors.js';
import { isRecord } from './guards.js';
import { requestJson } from './http.js';

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
  executionMode?: 'restricted' | 'unrestricted';
  loopBudget?: {
    maxIterations: number;
    maxToolCallsPerTurn: number;
    deadlineMs: number;
  };
  organizationContract?: '1.1.0';
  organizationPaths?: number;
  executionContract?: '1.2.0';
  executionPaths?: number;
  executionRunContract?: '1.3.0';
  executionRunPaths?: number;
  conversationContract?: '1.4.0';
  conversationPaths?: number;
  agentChatContract?: '1.8.0';
  agentChatPaths?: number;
}

export function hasRuntimeCapability(runtime: RuntimeInfo | null, capability: string): boolean {
  return runtime?.capabilities.includes(capability) ?? false;
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
    && (
      value.executionMode === undefined
      || value.executionMode === 'restricted'
      || value.executionMode === 'unrestricted'
    )
    && (value.loopBudget === undefined || isLoopBudget(value.loopBudget))
    && (value.organizationContract === undefined || value.organizationContract === '1.1.0')
    && (value.organizationPaths === undefined || Number.isInteger(value.organizationPaths))
    && (value.executionContract === undefined || value.executionContract === '1.2.0')
    && (value.executionPaths === undefined || Number.isInteger(value.executionPaths))
    && (value.executionRunContract === undefined || value.executionRunContract === '1.3.0')
    && (value.executionRunPaths === undefined || Number.isInteger(value.executionRunPaths))
    && (value.conversationContract === undefined || value.conversationContract === '1.4.0')
    && (value.conversationPaths === undefined || Number.isInteger(value.conversationPaths))
    && (value.agentChatContract === undefined || value.agentChatContract === '1.8.0')
    && (value.agentChatPaths === undefined || Number.isInteger(value.agentChatPaths));
}

function isLoopBudget(value: unknown): boolean {
  return isRecord(value)
    && Number.isInteger(value.maxIterations)
    && Number.isInteger(value.maxToolCallsPerTurn)
    && Number.isInteger(value.deadlineMs);
}

async function getJson<T>(
  path: string,
  isPayload: (value: unknown) => value is T,
  signal?: AbortSignal,
): Promise<T> {
  return requestJson(path, isPayload, {
    signal,
    invalidPayload: (failedPath) => new Error(`Runtime returned an invalid response from ${failedPath}`),
  });
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
