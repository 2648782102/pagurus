import type { RuntimeInfo } from './runtime.js';

export const EXECUTION_RUN_CONTRACT_VERSION = '1.3.0';
export const EXECUTION_RUN_PUBLIC_PATHS = Object.freeze([
  '/v1/execution/run-health',
  '/v1/execution/adapters',
  '/v1/execution/runs',
  '/v1/execution/runs/{runId}',
  '/v1/execution/runs/{runId}/start',
  '/v1/execution/runs/{runId}/cancel',
  '/v1/execution/runs/{runId}/recover',
  '/v1/execution/runs/{runId}/events',
] as const);

export interface ExecutionRunVersioned {
  readonly version: typeof EXECUTION_RUN_CONTRACT_VERSION;
}

export interface ExecutionAdapter {
  readonly version: typeof EXECUTION_RUN_CONTRACT_VERSION;
  readonly id: string;
  readonly kind: 'isolated-local-worker';
  readonly operations: readonly string[];
  readonly maxInputBytes: number;
  readonly maxRuntimeMs: number;
  readonly network: 'forbidden';
  readonly filesystem: 'no-user-paths';
  readonly createdAt: string;
}

export interface ExecutionRun {
  readonly version: typeof EXECUTION_RUN_CONTRACT_VERSION;
  readonly id: string;
  readonly requestId: string;
  readonly grantId: string;
  readonly operation: string;
  readonly argumentsDigest: string;
  readonly adapterId: string;
  readonly state: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'interrupted';
  readonly attempt: number;
  readonly expectedVersion: number;
  readonly workerPidDigest: string | null;
  readonly exitCode: number | null;
  readonly resultDigest: string | null;
  readonly errorDigest: string | null;
  readonly idempotencyKey: string;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
}

export interface ExecutionRunEvent {
  readonly version: typeof EXECUTION_RUN_CONTRACT_VERSION;
  readonly id: string;
  readonly sequence: number;
  readonly type: string;
  readonly data: Readonly<Record<string, string | number | boolean>>;
  readonly createdAt: string;
}

export interface ExecutionRunEventPage extends ExecutionRunVersioned {
  readonly events: readonly ExecutionRunEvent[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVersioned(value: unknown): value is ExecutionRunVersioned {
  return isRecord(value) && value.version === EXECUTION_RUN_CONTRACT_VERSION;
}

function isBoundedString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 240;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableInteger(value: unknown): value is number | null {
  return value === null || Number.isInteger(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAdapter(value: unknown): value is ExecutionAdapter {
  return isVersioned(value) && isRecord(value) && isBoundedString(value.id)
    && value.kind === 'isolated-local-worker' && isStringArray(value.operations)
    && Number.isInteger(value.maxInputBytes) && Number.isInteger(value.maxRuntimeMs)
    && value.network === 'forbidden' && value.filesystem === 'no-user-paths'
    && isBoundedString(value.createdAt);
}

function isRun(value: unknown): value is ExecutionRun {
  return isVersioned(value) && isRecord(value) && isBoundedString(value.id)
    && isBoundedString(value.requestId) && isBoundedString(value.grantId)
    && isBoundedString(value.operation) && isBoundedString(value.argumentsDigest)
    && isBoundedString(value.adapterId) && typeof value.state === 'string'
    && Number.isInteger(value.attempt) && Number.isInteger(value.expectedVersion)
    && isNullableString(value.workerPidDigest) && isNullableInteger(value.exitCode)
    && isNullableString(value.resultDigest) && isNullableString(value.errorDigest)
    && isBoundedString(value.idempotencyKey) && isBoundedString(value.createdAt)
    && isNullableString(value.startedAt) && isNullableString(value.finishedAt);
}

function isRunEvent(value: unknown): value is ExecutionRunEvent {
  return isVersioned(value) && isRecord(value) && isBoundedString(value.id)
    && Number.isInteger(value.sequence) && isBoundedString(value.type)
    && isRecord(value.data) && isBoundedString(value.createdAt);
}

function isAdapterList(value: unknown): value is ExecutionRunVersioned & { adapters: readonly ExecutionAdapter[] } {
  return isVersioned(value) && isRecord(value) && Array.isArray(value.adapters)
    && value.adapters.every(isAdapter);
}

function isRunList(value: unknown): value is ExecutionRunVersioned & { runs: readonly ExecutionRun[] } {
  return isVersioned(value) && isRecord(value) && Array.isArray(value.runs)
    && value.runs.every(isRun);
}

function isRunEnvelope(value: unknown): value is ExecutionRunVersioned & { run: ExecutionRun } {
  return isVersioned(value) && isRecord(value) && isRun(value.run);
}

function isRunEventPage(value: unknown): value is ExecutionRunEventPage {
  return isVersioned(value) && isRecord(value) && Array.isArray(value.events)
    && value.events.every(isRunEvent) && isNullableString(value.nextCursor)
    && typeof value.hasMore === 'boolean';
}

function isHealth(value: unknown): value is ExecutionRunVersioned & { status: 'ready'; paths: readonly string[] } {
  return isVersioned(value) && isRecord(value) && value.status === 'ready'
    && Array.isArray(value.paths) && value.paths.every((path) => typeof path === 'string');
}

export function supportsExecutionRunContract(runtime: RuntimeInfo | null): boolean {
  return runtime?.executionRunContract === EXECUTION_RUN_CONTRACT_VERSION
    && runtime.executionRunPaths === EXECUTION_RUN_PUBLIC_PATHS.length;
}

async function requestJson<T>(
  path: string,
  isPayload: (value: unknown) => value is T,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: 'application/json', ...(init?.body ? { 'content-type': 'application/json' } : {}) },
    signal: init?.signal,
    ...(init?.method ? { method: init.method } : {}),
    ...(init?.body ? { body: init.body } : {}),
  });
  if (!response.ok) throw new Error(`Runtime returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!isPayload(payload)) throw new Error(`Runtime returned an invalid response from ${path}`);
  return payload;
}

export function getExecutionRunHealth(signal?: AbortSignal) {
  return requestJson('/v1/execution/run-health', isHealth, { signal });
}

export function listExecutionAdapters(signal?: AbortSignal) {
  return requestJson('/v1/execution/adapters', isAdapterList, { signal });
}

export function listExecutionRuns(signal?: AbortSignal) {
  return requestJson('/v1/execution/runs', isRunList, { signal });
}

export function getExecutionRun(runId: string, signal?: AbortSignal) {
  return requestJson(`/v1/execution/runs/${encodeURIComponent(runId)}`, isRunEnvelope, { signal });
}

export function createExecutionRun(input: {
  readonly requestId: string;
  readonly expectedRequestVersion: number;
  readonly grantId: string;
  readonly operation: string;
  readonly argumentsDigest: string;
  readonly adapterId: string;
  readonly idempotencyKey: string;
}, signal?: AbortSignal) {
  return requestJson('/v1/execution/runs', isRunEnvelope, {
    method: 'POST', body: JSON.stringify(input), signal,
  });
}

export function startExecutionRun(runId: string, expectedVersion: number, signal?: AbortSignal) {
  return requestJson(`/v1/execution/runs/${encodeURIComponent(runId)}/start`, isRunEnvelope, {
    method: 'POST', body: JSON.stringify({ expectedVersion }), signal,
  });
}

export function cancelExecutionRun(runId: string, expectedVersion: number, signal?: AbortSignal) {
  return requestJson(`/v1/execution/runs/${encodeURIComponent(runId)}/cancel`, isRunEnvelope, {
    method: 'POST', body: JSON.stringify({ expectedVersion }), signal,
  });
}

export function recoverExecutionRun(runId: string, expectedVersion: number, signal?: AbortSignal) {
  return requestJson(`/v1/execution/runs/${encodeURIComponent(runId)}/recover`, isRunEnvelope, {
    method: 'POST', body: JSON.stringify({ expectedVersion }), signal,
  });
}

export function getExecutionRunEvents(runId: string, signal?: AbortSignal) {
  return requestJson(`/v1/execution/runs/${encodeURIComponent(runId)}/events`, isRunEventPage, { signal });
}
