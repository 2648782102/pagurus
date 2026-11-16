import { requestWorkJson, PLATFORM_VERSION } from './work.js';
import { isRecord } from './guards.js';

export type SourcePolicy = 'allow' | 'deny';

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

function isVersionTwo(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.version === PLATFORM_VERSION;
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

function isLocalSourceEventList(value: unknown): value is LocalSourceEventList {
  return isVersionTwo(value) && Array.isArray(value.events)
    && value.events.every(isLocalSourceEvent);
}

function isLocalSourceEventResponse(value: unknown): value is LocalSourceEventResponse {
  return isVersionTwo(value) && isLocalSourceEvent(value.event);
}

export function listLocalSourceEvents(signal?: AbortSignal): Promise<LocalSourceEventList> {
  return requestWorkJson('/v1/sources/local/events', isLocalSourceEventList, { signal });
}

export function ingestLocalSourceEvent(input: LocalSourceEventWrite): Promise<LocalSourceEventResponse> {
  return requestWorkJson('/v1/sources/local/events', isLocalSourceEventResponse, { method: 'POST', body: input });
}
