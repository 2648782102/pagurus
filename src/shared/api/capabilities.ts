import { hasRuntimeCapability, type RuntimeInfo } from './runtime.js';
import { PLATFORM_VERSION, requestWorkJson } from './work.js';
import { isRecord } from './guards.js';

export const CAPABILITY_DIRECTORY_CAPABILITY = 'capability-directory';

export function supportsCapabilityDirectory(runtime: RuntimeInfo | null): boolean {
  return hasRuntimeCapability(runtime, CAPABILITY_DIRECTORY_CAPABILITY);
}

export type CapabilityKind = 'mcp' | 'skill' | 'plugin' | 'secret-handle';
export type CapabilityStatus = 'enabled' | 'disabled';

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

function isCapabilityList(value: unknown): value is CapabilityList {
  return isVersionTwo(value) && Array.isArray(value.capabilities)
    && value.capabilities.every(isCapabilityRecord);
}

function isCapabilityResponse(value: unknown): value is CapabilityResponse {
  return isVersionTwo(value) && isCapabilityRecord(value.capability);
}

export function listCapabilities(signal?: AbortSignal): Promise<CapabilityList> {
  return requestWorkJson('/v1/capabilities', isCapabilityList, { signal });
}

export function putCapability(input: CapabilityWrite): Promise<CapabilityResponse> {
  return requestWorkJson('/v1/capabilities', isCapabilityResponse, { method: 'POST', body: input });
}
