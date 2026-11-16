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