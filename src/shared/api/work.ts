import type { RuntimeInfo } from './runtime.js';
import { hasRuntimeCapability } from './runtime.js';

export const WORK_CONTRACT_CAPABILITY = 'durable-work-contract';

export interface WorkModelReference {
  providerId: string;
  modelId: string;
}

export interface WorkItem {
  version: 1;
  id: string;
  state: 'open';
  threadId: string;
  triggerId: string;
  mandateId: string;
  mandateRevision: 1;
}

export interface WorkThread {
  version: 1;
  id: string;
  threadKey: string;
  contextOnly: true;
  triggerIds: string[];
  workItemId: string;
}

export interface WorkMandate {
  version: 1;
  id: string;
  workItemId: string;
  revision: 1;
  scope: string[];
  allowedOperations: string[];
  capabilitiesDigest: string;
}

export interface WorkAssignment {
  version: 1;
  id: string;
  workItemId: string;
  state: 'planned';
  agentRevisionId: string;
  configurationRevisionId: string;
  mandateRevision: 1;
  model: WorkModelReference;
}

export interface WorkOutboxRecord {
  version: 1;
  id: string;
  workItemId: string;
  assignmentId: string;
  status: 'pending';
  destinationDigest: string;
  payloadDigest: string;
}

export interface WorkDeliveryReceipt {
  version: 1;
  id: string;
  workItemId: string;
  outboxId: string;
  status: 'observed';
  destinationDigest: string;
  payloadDigest: string;
}

export interface WorkItemList {
  version: 1;
  workItems: WorkItem[];
}

export interface WorkItemDetail {
  version: 1;
  workItem: WorkItem;
  thread: WorkThread;
  mandate: WorkMandate;
  assignments: WorkAssignment[];
  outbox: WorkOutboxRecord[];
  deliveryReceipts: WorkDeliveryReceipt[];
}

export interface WorkDeliveryReceiptList {
  version: 1;
  deliveryReceipts: WorkDeliveryReceipt[];
}

export function supportsDurableWorkContract(runtime: RuntimeInfo | null): boolean {
  return hasRuntimeCapability(runtime, WORK_CONTRACT_CAPABILITY);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVersionOne(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.version === 1;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isModelReference(value: unknown): value is WorkModelReference {
  return isRecord(value)
    && typeof value.providerId === 'string'
    && typeof value.modelId === 'string';
}

function isWorkItem(value: unknown): value is WorkItem {
  return isVersionOne(value)
    && typeof value.id === 'string'
    && value.state === 'open'
    && typeof value.threadId === 'string'
    && typeof value.triggerId === 'string'
    && typeof value.mandateId === 'string'
    && value.mandateRevision === 1;
}

function isWorkThread(value: unknown): value is WorkThread {
  return isVersionOne(value)
    && typeof value.id === 'string'
    && typeof value.threadKey === 'string'
    && value.contextOnly === true
    && isStringArray(value.triggerIds)
    && typeof value.workItemId === 'string';
}

function isWorkMandate(value: unknown): value is WorkMandate {
  return isVersionOne(value)
    && typeof value.id === 'string'
    && typeof value.workItemId === 'string'
    && value.revision === 1
    && isStringArray(value.scope)
    && isStringArray(value.allowedOperations)
    && typeof value.capabilitiesDigest === 'string';
}

function isWorkAssignment(value: unknown): value is WorkAssignment {
  return isVersionOne(value)
    && typeof value.id === 'string'
    && typeof value.workItemId === 'string'
    && value.state === 'planned'
    && typeof value.agentRevisionId === 'string'
    && typeof value.configurationRevisionId === 'string'
    && value.mandateRevision === 1
    && isModelReference(value.model);
}

function isWorkOutboxRecord(value: unknown): value is WorkOutboxRecord {
  return isVersionOne(value)
    && typeof value.id === 'string'
    && typeof value.workItemId === 'string'
    && typeof value.assignmentId === 'string'
    && value.status === 'pending'
    && typeof value.destinationDigest === 'string'
    && typeof value.payloadDigest === 'string';
}

function isWorkDeliveryReceipt(value: unknown): value is WorkDeliveryReceipt {
  return isVersionOne(value)
    && typeof value.id === 'string'
    && typeof value.workItemId === 'string'
    && typeof value.outboxId === 'string'
    && value.status === 'observed'
    && typeof value.destinationDigest === 'string'
    && typeof value.payloadDigest === 'string';
}

function isWorkItemList(value: unknown): value is WorkItemList {
  return isVersionOne(value)
    && Array.isArray(value.workItems)
    && value.workItems.every(isWorkItem);
}

function isWorkItemDetail(value: unknown): value is WorkItemDetail {
  return isVersionOne(value)
    && isWorkItem(value.workItem)
    && isWorkThread(value.thread)
    && isWorkMandate(value.mandate)
    && Array.isArray(value.assignments)
    && value.assignments.every(isWorkAssignment)
    && Array.isArray(value.outbox)
    && value.outbox.every(isWorkOutboxRecord)
    && Array.isArray(value.deliveryReceipts)
    && value.deliveryReceipts.every(isWorkDeliveryReceipt);
}

function isWorkDeliveryReceiptList(value: unknown): value is WorkDeliveryReceiptList {
  return isVersionOne(value)
    && Array.isArray(value.deliveryReceipts)
    && value.deliveryReceipts.every(isWorkDeliveryReceipt);
}

async function getWorkJson<T>(
  path: string,
  isPayload: (value: unknown) => value is T,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Runtime returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!isPayload(payload)) throw new Error(`Runtime returned an invalid response from ${path}`);
  return payload;
}

export function listWorkItems(signal?: AbortSignal): Promise<WorkItemList> {
  return getWorkJson('/v1/work/items', isWorkItemList, signal);
}

export function getWorkItem(workItemId: string, signal?: AbortSignal): Promise<WorkItemDetail> {
  return getWorkJson(
    `/v1/work/items/${encodeURIComponent(workItemId)}`,
    isWorkItemDetail,
    signal,
  );
}

export function listWorkDeliveryReceipts(signal?: AbortSignal): Promise<WorkDeliveryReceiptList> {
  return getWorkJson('/v1/work/delivery-receipts', isWorkDeliveryReceiptList, signal);
}
