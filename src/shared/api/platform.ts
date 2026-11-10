import { hasRuntimeCapability, type RuntimeInfo } from './runtime.js';
import { PLATFORM_VERSION, requestWorkJson } from './work.js';

export const CAPABILITY_DIRECTORY_CAPABILITY = 'capability-directory';
export const WRITE_ONLY_SECRET_HANDLES_CAPABILITY = 'write-only-secret-handles';

export function supportsCapabilityDirectory(runtime: RuntimeInfo | null): boolean {
  return hasRuntimeCapability(runtime, CAPABILITY_DIRECTORY_CAPABILITY);
}

export function supportsWriteOnlySecretHandles(runtime: RuntimeInfo | null): boolean {
  return hasRuntimeCapability(runtime, WRITE_ONLY_SECRET_HANDLES_CAPABILITY);
}

export type CapabilityKind = 'mcp' | 'skill' | 'plugin' | 'secret-handle';
export type CapabilityStatus = 'enabled' | 'disabled';
export type SourcePolicy = 'allow' | 'deny';
export type SecretHandleStatus = 'active' | 'disabled';

export interface CapabilityRecord {
  version: typeof PLATFORM_VERSION;
  id: string;
  kind: CapabilityKind;
  name: string;
  status: CapabilityStatus;
  descriptor: string;
  createdAt: string;
}

export interface CapabilityList {
  version: typeof PLATFORM_VERSION;
  capabilities: CapabilityRecord[];
}

export interface CapabilityWrite {
  kind: CapabilityKind;
  name: string;
  status: CapabilityStatus;
  descriptor: string;
}

export interface CapabilityResponse {
  version: typeof PLATFORM_VERSION;
  capability: CapabilityRecord;
}

export interface LocalSourceEvent {
  version: typeof PLATFORM_VERSION;
  id: string;
  sourceId: string;
  threadKey: string;
  payloadDigest: string;
  occurredAt: string;
  policy: SourcePolicy;
  mandateDigest: string;
}

export interface LocalSourceEventList {
  version: typeof PLATFORM_VERSION;
  events: LocalSourceEvent[];
}

export interface LocalSourceEventWrite {
  sourceId: string;
  threadKey: string;
  payloadDigest: string;
  occurredAt: string;
  policy: SourcePolicy;
  mandateDigest: string;
}

export interface LocalSourceEventResponse {
  version: typeof PLATFORM_VERSION;
  event: LocalSourceEvent;
}

export interface SecretHandleRecord {
  version: typeof PLATFORM_VERSION;
  id: string;
  key: string;
  secretVersion: number;
  status: SecretHandleStatus;
  purpose: string;
  allowedAdapter: string;
  destinationBinding: string;
  valueDigest: string;
  createdAt: string;
  rotatedAt: string | null;
}

export interface SecretHandleList {
  version: typeof PLATFORM_VERSION;
  handles: SecretHandleRecord[];
}

export interface SecretHandleCreate {
  key: string;
  value: string;
  purpose: string;
  allowedAdapter: string;
  destinationBinding: string;
}

export interface SecretHandleResponse {
  version: typeof PLATFORM_VERSION;
  handle: SecretHandleRecord;
}

export interface SecretHandleUseReceipt {
  version: typeof PLATFORM_VERSION;
  id: string;
  handleId: string;
  secretVersionDigest: string;
  grantRevision: string;
  adapterId: string;
  destinationDigest: string;
  outcome: 'injected' | 'denied';
  workItemId: string;
  assignmentId: string;
  createdAt: string;
}

export interface SecretHandleUseReceiptList {
  version: typeof PLATFORM_VERSION;
  receipts: SecretHandleUseReceipt[];
}

export interface SecretHandleUseWrite {
  handleId: string;
  workItemId: string;
  assignmentId: string;
  grantRevision: string;
}

export interface SecretHandleUseResponse {
  version: typeof PLATFORM_VERSION;
  receipt: SecretHandleUseReceipt;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVersionTwo(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.version === PLATFORM_VERSION;
}

function isCapabilityRecord(value: unknown): value is CapabilityRecord {
  return isVersionTwo(value)
    && typeof value.id === 'string'
    && ['mcp', 'skill', 'plugin', 'secret-handle'].includes(value.kind as string)
    && typeof value.name === 'string'
    && ['enabled', 'disabled'].includes(value.status as string)
    && typeof value.descriptor === 'string'
    && typeof value.createdAt === 'string';
}

function isLocalSourceEvent(value: unknown): value is LocalSourceEvent {
  return isVersionTwo(value)
    && typeof value.id === 'string'
    && typeof value.sourceId === 'string'
    && typeof value.threadKey === 'string'
    && typeof value.payloadDigest === 'string'
    && typeof value.occurredAt === 'string'
    && ['allow', 'deny'].includes(value.policy as string)
    && typeof value.mandateDigest === 'string';
}

function isSecretHandleRecord(value: unknown): value is SecretHandleRecord {
  return isVersionTwo(value)
    && typeof value.id === 'string'
    && typeof value.key === 'string'
    && typeof value.secretVersion === 'number'
    && ['active', 'disabled'].includes(value.status as string)
    && typeof value.purpose === 'string'
    && typeof value.allowedAdapter === 'string'
    && typeof value.destinationBinding === 'string'
    && typeof value.valueDigest === 'string'
    && typeof value.createdAt === 'string'
    && (value.rotatedAt === null || typeof value.rotatedAt === 'string');
}

function isSecretHandleUseReceipt(value: unknown): value is SecretHandleUseReceipt {
  return isVersionTwo(value)
    && typeof value.id === 'string'
    && typeof value.handleId === 'string'
    && typeof value.secretVersionDigest === 'string'
    && typeof value.grantRevision === 'string'
    && typeof value.adapterId === 'string'
    && typeof value.destinationDigest === 'string'
    && ['injected', 'denied'].includes(value.outcome as string)
    && typeof value.workItemId === 'string'
    && typeof value.assignmentId === 'string'
    && typeof value.createdAt === 'string';
}

function isList<T>(value: unknown, key: string, guard: (item: unknown) => item is T): value is Record<string, unknown> & { [name: string]: T[] } {
  return isVersionTwo(value) && Array.isArray(value[key]) && value[key].every(guard);
}

function isCapabilityList(value: unknown): value is CapabilityList {
  return isList(value, 'capabilities', isCapabilityRecord);
}

function isLocalSourceEventList(value: unknown): value is LocalSourceEventList {
  return isList(value, 'events', isLocalSourceEvent);
}

function isSecretHandleList(value: unknown): value is SecretHandleList {
  return isList(value, 'handles', isSecretHandleRecord);
}

function isSecretHandleUseReceiptList(value: unknown): value is SecretHandleUseReceiptList {
  return isList(value, 'receipts', isSecretHandleUseReceipt);
}

function isCapabilityResponse(value: unknown): value is CapabilityResponse {
  return isVersionTwo(value) && isCapabilityRecord(value.capability);
}

function isLocalSourceEventResponse(value: unknown): value is LocalSourceEventResponse {
  return isVersionTwo(value) && isLocalSourceEvent(value.event);
}

function isSecretHandleResponse(value: unknown): value is SecretHandleResponse {
  return isVersionTwo(value) && isSecretHandleRecord(value.handle);
}

function isSecretHandleUseResponse(value: unknown): value is SecretHandleUseResponse {
  return isVersionTwo(value) && isSecretHandleUseReceipt(value.receipt);
}

export function listCapabilities(signal?: AbortSignal): Promise<CapabilityList> {
  return requestWorkJson('/v1/capabilities', isCapabilityList, { signal });
}

export function putCapability(input: CapabilityWrite): Promise<CapabilityResponse> {
  return requestWorkJson('/v1/capabilities', isCapabilityResponse, { method: 'POST', body: input });
}

export function listLocalSourceEvents(signal?: AbortSignal): Promise<LocalSourceEventList> {
  return requestWorkJson('/v1/sources/local/events', isLocalSourceEventList, { signal });
}

export function ingestLocalSourceEvent(input: LocalSourceEventWrite): Promise<LocalSourceEventResponse> {
  return requestWorkJson('/v1/sources/local/events', isLocalSourceEventResponse, { method: 'POST', body: input });
}

export function listSecretHandles(signal?: AbortSignal): Promise<SecretHandleList> {
  return requestWorkJson('/v1/secret-handles', isSecretHandleList, { signal });
}

export function createSecretHandle(input: SecretHandleCreate): Promise<SecretHandleResponse> {
  return requestWorkJson('/v1/secret-handles', isSecretHandleResponse, { method: 'POST', body: input });
}

export function rotateSecretHandle(handleId: string, value: string): Promise<SecretHandleResponse> {
  return requestWorkJson(
    `/v1/secret-handles/${encodeURIComponent(handleId)}/rotate`,
    isSecretHandleResponse,
    { method: 'POST', body: { value } },
  );
}

export function setSecretHandleStatus(
  handleId: string,
  status: SecretHandleStatus,
): Promise<SecretHandleResponse> {
  return requestWorkJson(
    `/v1/secret-handles/${encodeURIComponent(handleId)}/status`,
    isSecretHandleResponse,
    { method: 'POST', body: { status } },
  );
}

export function useSecretHandle(input: SecretHandleUseWrite): Promise<SecretHandleUseResponse> {
  return requestWorkJson(
    `/v1/secret-handles/${encodeURIComponent(input.handleId)}/use`,
    isSecretHandleUseResponse,
    { method: 'POST', body: input },
  );
}

export function listSecretHandleUseReceipts(signal?: AbortSignal): Promise<SecretHandleUseReceiptList> {
  return requestWorkJson('/v1/secret-handles/use-receipts', isSecretHandleUseReceiptList, { signal });
}
