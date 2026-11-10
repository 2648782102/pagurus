import { hasRuntimeCapability, type RuntimeInfo } from './runtime.js';

export const WORK_CONTRACT_CAPABILITY = 'durable-work-contract';
export const ASYNCHRONOUS_WORK_CONTROL_CAPABILITY = 'asynchronous-work-control';
export const LOCAL_SOURCE_POLICY_CAPABILITY = 'local-source-policy';
export const PLATFORM_VERSION = 2;

export type WorkState = 'open' | 'running' | 'paused' | 'completed' | 'cancelled';
export type AssignmentState = 'planned' | 'running' | 'interrupted' | 'succeeded' | 'failed' | 'cancelled';
export type OutboxState = 'pending' | 'sent' | 'delivered' | 'failed';
export type ReceiptState = 'observed' | 'accepted' | 'rejected';

export interface WorkModelReference {
  providerId: string;
  modelId: string;
}

export interface WorkItem {
  version: typeof PLATFORM_VERSION;
  id: string;
  state: WorkState;
  threadId: string;
  triggerId: string;
  mandateId: string;
  mandateRevision: 1;
}

export interface WorkThread {
  version: typeof PLATFORM_VERSION;
  id: string;
  threadKey: string;
  contextOnly: true;
  triggerIds: string[];
  workItemId: string;
}

export interface WorkMandate {
  version: typeof PLATFORM_VERSION;
  id: string;
  workItemId: string;
  revision: 1;
  scope: string[];
  allowedOperations: string[];
  capabilitiesDigest: string;
}

export interface WorkAssignment {
  version: typeof PLATFORM_VERSION;
  id: string;
  workItemId: string;
  state: AssignmentState;
  agentRevisionId: string;
  configurationRevisionId: string;
  mandateRevision: 1;
  model: WorkModelReference;
}

export interface WorkOutboxRecord {
  version: typeof PLATFORM_VERSION;
  id: string;
  workItemId: string;
  assignmentId: string;
  status: OutboxState;
  destinationDigest: string;
  payloadDigest: string;
}

export interface WorkDeliveryReceipt {
  version: typeof PLATFORM_VERSION;
  id: string;
  workItemId: string;
  outboxId: string;
  status: ReceiptState;
  destinationDigest: string;
  payloadDigest: string;
}

export interface WorkEvent {
  version: typeof PLATFORM_VERSION;
  id: string;
  sequence: number;
  type: string;
  workItemId: string;
  data: Record<string, string | number | boolean>;
}

export interface WorkItemList {
  version: typeof PLATFORM_VERSION;
  workItems: WorkItem[];
}

export interface WorkItemDetail {
  version: typeof PLATFORM_VERSION;
  workItem: WorkItem;
  thread: WorkThread;
  mandate: WorkMandate;
  assignments: WorkAssignment[];
  outbox: WorkOutboxRecord[];
  deliveryReceipts: WorkDeliveryReceipt[];
}

export interface WorkDeliveryReceiptList {
  version: typeof PLATFORM_VERSION;
  deliveryReceipts: WorkDeliveryReceipt[];
}

export interface WorkEventList {
  version: typeof PLATFORM_VERSION;
  events: WorkEvent[];
}

export interface WorkControlResponse {
  version: typeof PLATFORM_VERSION;
  workItem: WorkItem;
}

export function supportsDurableWorkContract(runtime: RuntimeInfo | null): boolean {
  return hasRuntimeCapability(runtime, WORK_CONTRACT_CAPABILITY);
}

export function supportsAsynchronousWorkControl(runtime: RuntimeInfo | null): boolean {
  return hasRuntimeCapability(runtime, ASYNCHRONOUS_WORK_CONTROL_CAPABILITY);
}

export function supportsLocalSourcePolicy(runtime: RuntimeInfo | null): boolean {
  return hasRuntimeCapability(runtime, LOCAL_SOURCE_POLICY_CAPABILITY);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVersionTwo(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.version === PLATFORM_VERSION;
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
  return isVersionTwo(value)
    && typeof value.id === 'string'
    && ['open', 'running', 'paused', 'completed', 'cancelled'].includes(value.state as string)
    && typeof value.threadId === 'string'
    && typeof value.triggerId === 'string'
    && typeof value.mandateId === 'string'
    && value.mandateRevision === 1;
}

function isWorkThread(value: unknown): value is WorkThread {
  return isVersionTwo(value)
    && typeof value.id === 'string'
    && typeof value.threadKey === 'string'
    && value.contextOnly === true
    && isStringArray(value.triggerIds)
    && typeof value.workItemId === 'string';
}

function isWorkMandate(value: unknown): value is WorkMandate {
  return isVersionTwo(value)
    && typeof value.id === 'string'
    && typeof value.workItemId === 'string'
    && value.revision === 1
    && isStringArray(value.scope)
    && isStringArray(value.allowedOperations)
    && typeof value.capabilitiesDigest === 'string';
}

function isWorkAssignment(value: unknown): value is WorkAssignment {
  return isVersionTwo(value)
    && typeof value.id === 'string'
    && typeof value.workItemId === 'string'
    && ['planned', 'running', 'interrupted', 'succeeded', 'failed', 'cancelled'].includes(value.state as string)
    && typeof value.agentRevisionId === 'string'
    && typeof value.configurationRevisionId === 'string'
    && value.mandateRevision === 1
    && isModelReference(value.model);
}

function isWorkOutboxRecord(value: unknown): value is WorkOutboxRecord {
  return isVersionTwo(value)
    && typeof value.id === 'string'
    && typeof value.workItemId === 'string'
    && typeof value.assignmentId === 'string'
    && ['pending', 'sent', 'delivered', 'failed'].includes(value.status as string)
    && typeof value.destinationDigest === 'string'
    && typeof value.payloadDigest === 'string';
}

function isWorkDeliveryReceipt(value: unknown): value is WorkDeliveryReceipt {
  return isVersionTwo(value)
    && typeof value.id === 'string'
    && typeof value.workItemId === 'string'
    && typeof value.outboxId === 'string'
    && ['observed', 'accepted', 'rejected'].includes(value.status as string)
    && typeof value.destinationDigest === 'string'
    && typeof value.payloadDigest === 'string';
}

function isWorkEvent(value: unknown): value is WorkEvent {
  return isVersionTwo(value)
    && typeof value.id === 'string'
    && typeof value.sequence === 'number'
    && typeof value.type === 'string'
    && typeof value.workItemId === 'string'
    && isRecord(value.data)
    && Object.values(value.data).every((item) => ['string', 'number', 'boolean'].includes(typeof item));
}

function isWorkItemList(value: unknown): value is WorkItemList {
  return isVersionTwo(value)
    && Array.isArray(value.workItems)
    && value.workItems.every(isWorkItem);
}

function isWorkItemDetail(value: unknown): value is WorkItemDetail {
  return isVersionTwo(value)
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
  return isVersionTwo(value)
    && Array.isArray(value.deliveryReceipts)
    && value.deliveryReceipts.every(isWorkDeliveryReceipt);
}

function isWorkEventList(value: unknown): value is WorkEventList {
  return isVersionTwo(value)
    && Array.isArray(value.events)
    && value.events.every(isWorkEvent);
}

function isWorkControlResponse(value: unknown): value is WorkControlResponse {
  return isVersionTwo(value) && isWorkItem(value.workItem);
}

export async function requestWorkJson<T>(
  path: string,
  isPayload: (value: unknown) => value is T,
  init?: { signal?: AbortSignal; method?: 'GET' | 'POST'; body?: unknown },
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init?.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, {
    method: init?.method ?? 'GET',
    headers,
    ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    ...(init?.signal === undefined ? {} : { signal: init.signal }),
  });
  if (!response.ok) throw new Error(`Runtime returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!isPayload(payload)) throw new Error(`Runtime returned an invalid response from ${path}`);
  return payload;
}

export function listWorkItems(signal?: AbortSignal): Promise<WorkItemList> {
  return requestWorkJson('/v1/work/items', isWorkItemList, { signal });
}

export function getWorkItem(workItemId: string, signal?: AbortSignal): Promise<WorkItemDetail> {
  return requestWorkJson(
    `/v1/work/items/${encodeURIComponent(workItemId)}`,
    isWorkItemDetail,
    { signal },
  );
}

export function listWorkDeliveryReceipts(signal?: AbortSignal): Promise<WorkDeliveryReceiptList> {
  return requestWorkJson('/v1/work/delivery-receipts', isWorkDeliveryReceiptList, { signal });
}

export function listWorkEvents(signal?: AbortSignal): Promise<WorkEventList> {
  return requestWorkJson('/v1/work/events', isWorkEventList, { signal });
}

export function startWorkItem(workItemId: string, expectedState: WorkState): Promise<WorkControlResponse> {
  return requestWorkJson(
    `/v1/work/items/${encodeURIComponent(workItemId)}/start`,
    isWorkControlResponse,
    { method: 'POST', body: { expectedState } },
  );
}

export function stopWorkItem(workItemId: string, expectedState: WorkState): Promise<WorkControlResponse> {
  return requestWorkJson(
    `/v1/work/items/${encodeURIComponent(workItemId)}/stop`,
    isWorkControlResponse,
    { method: 'POST', body: { expectedState } },
  );
}

export function completeWorkItem(workItemId: string, expectedState: WorkState): Promise<WorkControlResponse> {
  return requestWorkJson(
    `/v1/work/items/${encodeURIComponent(workItemId)}/complete`,
    isWorkControlResponse,
    { method: 'POST', body: { expectedState } },
  );
}

export function reconcileAssignment(
  assignmentId: string,
  outcome: 'succeeded' | 'failed',
): Promise<WorkControlResponse> {
  return requestWorkJson(
    `/v1/work/assignments/${encodeURIComponent(assignmentId)}/reconcile`,
    isWorkControlResponse,
    { method: 'POST', body: { outcome } },
  );
}

export function decideDeliveryReceipt(
  receiptId: string,
  decision: 'accepted' | 'rejected',
): Promise<WorkControlResponse> {
  return requestWorkJson(
    `/v1/work/delivery-receipts/${encodeURIComponent(receiptId)}/decision`,
    isWorkControlResponse,
    { method: 'POST', body: { decision } },
  );
}
