import type { RuntimeInfo } from './runtime.js';

export const EXECUTION_CONTRACT_VERSION = '1.2.0';
export const EXECUTION_PUBLIC_PATHS = Object.freeze([
  '/v1/execution/health',
  '/v1/execution/capabilities',
  '/v1/execution/grants',
  '/v1/execution/grants/{grantId}/revoke',
  '/v1/execution/requests',
  '/v1/execution/requests/{requestId}',
  '/v1/execution/requests/{requestId}/decide',
  '/v1/execution/events',
] as const);

export interface ExecutionVersioned {
  readonly version: typeof EXECUTION_CONTRACT_VERSION;
}

export interface ExecutionCapability {
  readonly version: typeof EXECUTION_CONTRACT_VERSION;
  readonly id: string;
  readonly kind: 'mcp' | 'skill' | 'plugin' | 'secret-handle' | 'fake';
  readonly name: string;
  readonly adapterId: string;
  readonly destinationDigest: string;
  readonly capabilitiesDigest: string;
  readonly state: 'recorded' | 'enabled' | 'revoked';
  readonly createdAt: string;
}

export interface ExecutionGrant {
  readonly version: typeof EXECUTION_CONTRACT_VERSION;
  readonly id: string;
  readonly capabilityId: string;
  readonly state: 'granted' | 'revoked';
  readonly expectedVersion: number;
  readonly agentId: string;
  readonly agentRevisionId: string;
  readonly configurationRevisionId: string;
  readonly delegationId: string;
  readonly projectId: string;
  readonly workItemId: string;
  readonly assignmentId: string;
  readonly operation: string;
  readonly destinationDigest: string;
  readonly scope: readonly string[];
  readonly capabilities: readonly string[];
  readonly expiresAtSequence: number;
  readonly createdAt: string;
  readonly revokedAt: string | null;
}

export interface ExecutionRequest {
  readonly version: typeof EXECUTION_CONTRACT_VERSION;
  readonly id: string;
  readonly grantId: string;
  readonly state: 'pending' | 'approved' | 'rejected' | 'running' | 'succeeded' | 'failed';
  readonly expectedVersion: number;
  readonly operation: string;
  readonly argumentsDigest: string;
  readonly idempotencyKey: string;
  readonly resultDigest: string | null;
  readonly errorDigest: string | null;
  readonly createdAt: string;
  readonly decidedAt: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
}

export interface ExecutionEvent {
  readonly version: typeof EXECUTION_CONTRACT_VERSION;
  readonly id: string;
  readonly sequence: number;
  readonly type: string;
  readonly data: Readonly<Record<string, string | number | boolean>>;
  readonly createdAt: string;
}

export interface ExecutionEventPage extends ExecutionVersioned {
  readonly events: readonly ExecutionEvent[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

export interface CreateExecutionGrantInput {
  readonly capabilityId: string;
  readonly agentId: string;
  readonly agentRevisionId: string;
  readonly configurationRevisionId: string;
  readonly delegationId: string;
  readonly projectId: string;
  readonly workItemId: string;
  readonly assignmentId: string;
  readonly operation: string;
  readonly destinationDigest: string;
  readonly scope: readonly string[];
  readonly capabilities: readonly string[];
  readonly expiresAtSequence: number;
}

export interface CreateExecutionRequestInput {
  readonly grantId: string;
  readonly expectedGrantVersion: number;
  readonly operation: string;
  readonly argumentsDigest: string;
  readonly idempotencyKey: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVersioned(value: unknown): value is ExecutionVersioned {
  return isRecord(value) && value.version === EXECUTION_CONTRACT_VERSION;
}

function isBoundedString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 240;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isCapability(value: unknown): value is ExecutionCapability {
  return isVersioned(value) && isRecord(value) && isBoundedString(value.id)
    && isBoundedString(value.name) && isBoundedString(value.adapterId)
    && isBoundedString(value.destinationDigest) && isBoundedString(value.capabilitiesDigest)
    && typeof value.state === 'string' && isBoundedString(value.createdAt);
}

function isGrant(value: unknown): value is ExecutionGrant {
  return isVersioned(value) && isRecord(value) && isBoundedString(value.id)
    && isBoundedString(value.capabilityId) && typeof value.state === 'string'
    && Number.isInteger(value.expectedVersion) && isBoundedString(value.agentId)
    && isBoundedString(value.agentRevisionId) && isBoundedString(value.configurationRevisionId)
    && isBoundedString(value.delegationId) && isBoundedString(value.projectId)
    && isBoundedString(value.workItemId) && isBoundedString(value.assignmentId)
    && isBoundedString(value.operation) && isBoundedString(value.destinationDigest)
    && isStringArray(value.scope) && isStringArray(value.capabilities)
    && Number.isInteger(value.expiresAtSequence) && isBoundedString(value.createdAt)
    && isNullableString(value.revokedAt);
}

function isRequest(value: unknown): value is ExecutionRequest {
  return isVersioned(value) && isRecord(value) && isBoundedString(value.id)
    && isBoundedString(value.grantId) && typeof value.state === 'string'
    && Number.isInteger(value.expectedVersion) && isBoundedString(value.operation)
    && isBoundedString(value.argumentsDigest) && isBoundedString(value.idempotencyKey)
    && isNullableString(value.resultDigest) && isNullableString(value.errorDigest)
    && isBoundedString(value.createdAt) && isNullableString(value.decidedAt)
    && isNullableString(value.startedAt) && isNullableString(value.finishedAt);
}

function isEvent(value: unknown): value is ExecutionEvent {
  return isVersioned(value) && isRecord(value) && isBoundedString(value.id)
    && Number.isInteger(value.sequence) && isBoundedString(value.type)
    && isRecord(value.data) && isBoundedString(value.createdAt);
}

function isCapabilityList(value: unknown): value is ExecutionVersioned & { capabilities: readonly ExecutionCapability[] } {
  return isVersioned(value) && isRecord(value) && Array.isArray(value.capabilities)
    && value.capabilities.every(isCapability);
}

function isGrantList(value: unknown): value is ExecutionVersioned & { grants: readonly ExecutionGrant[] } {
  return isVersioned(value) && isRecord(value) && Array.isArray(value.grants)
    && value.grants.every(isGrant);
}

function isGrantEnvelope(value: unknown): value is ExecutionVersioned & { grant: ExecutionGrant } {
  return isVersioned(value) && isRecord(value) && isGrant(value.grant);
}

function isRequestEnvelope(value: unknown): value is ExecutionVersioned & { request: ExecutionRequest } {
  return isVersioned(value) && isRecord(value) && isRequest(value.request);
}

function isEventPage(value: unknown): value is ExecutionEventPage {
  return isVersioned(value) && isRecord(value) && Array.isArray(value.events)
    && value.events.every(isEvent) && isNullableString(value.nextCursor)
    && typeof value.hasMore === 'boolean';
}

function isHealth(value: unknown): value is ExecutionVersioned & { status: 'ready'; paths: readonly string[] } {
  return isVersioned(value) && isRecord(value) && value.status === 'ready'
    && Array.isArray(value.paths) && value.paths.every((path) => typeof path === 'string');
}

export function supportsExecutionContract(runtime: RuntimeInfo | null): boolean {
  return runtime?.executionContract === EXECUTION_CONTRACT_VERSION
    && runtime.executionPaths === EXECUTION_PUBLIC_PATHS.length;
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

export function getExecutionHealth(signal?: AbortSignal) {
  return requestJson('/v1/execution/health', isHealth, { signal });
}

export function listExecutionCapabilities(signal?: AbortSignal) {
  return requestJson('/v1/execution/capabilities', isCapabilityList, { signal });
}

export function listExecutionGrants(signal?: AbortSignal) {
  return requestJson('/v1/execution/grants', isGrantList, { signal });
}

export function createExecutionGrant(input: CreateExecutionGrantInput, signal?: AbortSignal) {
  return requestJson('/v1/execution/grants', isGrantEnvelope, {
    method: 'POST', body: JSON.stringify(input), signal,
  });
}

export function revokeExecutionGrant(
  grantId: string,
  expectedVersion: number,
  signal?: AbortSignal,
) {
  return requestJson(`/v1/execution/grants/${encodeURIComponent(grantId)}/revoke`, isGrantEnvelope, {
    method: 'POST', body: JSON.stringify({ expectedVersion }), signal,
  });
}

export function createExecutionRequest(input: CreateExecutionRequestInput, signal?: AbortSignal) {
  return requestJson('/v1/execution/requests', isRequestEnvelope, {
    method: 'POST', body: JSON.stringify(input), signal,
  });
}

export function getExecutionRequest(requestId: string, signal?: AbortSignal) {
  return requestJson(`/v1/execution/requests/${encodeURIComponent(requestId)}`, isRequestEnvelope, { signal });
}

export function decideExecutionRequest(
  requestId: string,
  expectedVersion: number,
  decision: 'approved' | 'rejected',
  reasonDigest: string,
  signal?: AbortSignal,
) {
  return requestJson(`/v1/execution/requests/${encodeURIComponent(requestId)}/decide`, isRequestEnvelope, {
    method: 'POST',
    body: JSON.stringify({ expectedVersion, decision, reasonDigest }),
    signal,
  });
}

export function getExecutionEvents(after?: string, limit = 100, signal?: AbortSignal) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (after) query.set('after', after);
  return requestJson(`/v1/execution/events?${query.toString()}`, isEventPage, { signal });
}
