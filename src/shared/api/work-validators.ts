import { isRecord, isStringArray } from './guards.js';
import {
  PLATFORM_VERSION,
  type WorkAssignment,
  type WorkControlResponse,
  type WorkDeliveryReceipt,
  type WorkDeliveryReceiptList,
  type WorkEvent,
  type WorkEventList,
  type WorkItem,
  type WorkItemDetail,
  type WorkItemList,
  type WorkMandate,
  type WorkModelReference,
  type WorkOutboxRecord,
  type WorkThread,
} from './work-contract.js';

/**
 * Version-2 work payload validators.
 *
 * These are copied unchanged from the pre-split module: they encode the
 * published contract, including the exact field names and required revisions.
 * A list route and a detail route describe the same records differently, so
 * each validator stays next to the shape it guards.
 */

function isVersionTwo(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.version === PLATFORM_VERSION;
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

export function isWorkItemList(value: unknown): value is WorkItemList {
  return isVersionTwo(value)
    && Array.isArray(value.workItems)
    && value.workItems.every(isWorkItem);
}

export function isWorkItemDetail(value: unknown): value is WorkItemDetail {
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

export function isWorkDeliveryReceiptList(value: unknown): value is WorkDeliveryReceiptList {
  return isVersionTwo(value)
    && Array.isArray(value.deliveryReceipts)
    && value.deliveryReceipts.every(isWorkDeliveryReceipt);
}

export function isWorkEventList(value: unknown): value is WorkEventList {
  return isVersionTwo(value)
    && Array.isArray(value.events)
    && value.events.every(isWorkEvent);
}

export function isWorkControlResponse(value: unknown): value is WorkControlResponse {
  return isVersionTwo(value) && isWorkItem(value.workItem);
}

