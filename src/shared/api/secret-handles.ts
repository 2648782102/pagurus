import { hasRuntimeCapability, type RuntimeInfo } from './runtime.js';
import { PLATFORM_VERSION, requestWorkJson } from './work.js';
import { isRecord } from './guards.js';

export const WRITE_ONLY_SECRET_HANDLES_CAPABILITY = 'write-only-secret-handles';

export function supportsWriteOnlySecretHandles(runtime: RuntimeInfo | null): boolean {
  return hasRuntimeCapability(runtime, WRITE_ONLY_SECRET_HANDLES_CAPABILITY);
}

export type SecretHandleStatus = 'active' | 'disabled';

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

function isVersionTwo(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.version === PLATFORM_VERSION;
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

function isSecretHandleList(value: unknown): value is SecretHandleList {
  return isVersionTwo(value) && Array.isArray(value.handles)
    && value.handles.every(isSecretHandleRecord);
}

function isSecretHandleUseReceiptList(value: unknown): value is SecretHandleUseReceiptList {
  return isVersionTwo(value) && Array.isArray(value.receipts)
    && value.receipts.every(isSecretHandleUseReceipt);
}

function isSecretHandleResponse(value: unknown): value is SecretHandleResponse {
  return isVersionTwo(value) && isSecretHandleRecord(value.handle);
}

function isSecretHandleUseResponse(value: unknown): value is SecretHandleUseResponse {
  return isVersionTwo(value) && isSecretHandleUseReceipt(value.receipt);
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
