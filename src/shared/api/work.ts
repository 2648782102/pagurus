import { jsonBody, requestJson } from './http.js';
import { hasRuntimeCapability, type RuntimeInfo } from './runtime.js';
import {
  ASYNCHRONOUS_WORK_CONTROL_CAPABILITY,
  LOCAL_SOURCE_POLICY_CAPABILITY,
  WORK_CONTRACT_CAPABILITY,
  type WorkControlResponse,
  type WorkDeliveryReceiptList,
  type WorkEventList,
  type WorkItemDetail,
  type WorkItemList,
  type WorkState,
} from './work-contract.js';
import {
  isWorkControlResponse,
  isWorkDeliveryReceiptList,
  isWorkEventList,
  isWorkItemDetail,
  isWorkItemList,
} from './work-validators.js';

export * from './work-contract.js';

export function supportsDurableWorkContract(runtime: RuntimeInfo | null): boolean {
  return hasRuntimeCapability(runtime, WORK_CONTRACT_CAPABILITY);
}

export function supportsAsynchronousWorkControl(runtime: RuntimeInfo | null): boolean {
  return hasRuntimeCapability(runtime, ASYNCHRONOUS_WORK_CONTROL_CAPABILITY);
}

export function supportsLocalSourcePolicy(runtime: RuntimeInfo | null): boolean {
  return hasRuntimeCapability(runtime, LOCAL_SOURCE_POLICY_CAPABILITY);
}

export async function requestWorkJson<T>(
  path: string,
  isPayload: (value: unknown) => value is T,
  init?: { signal?: AbortSignal; method?: 'GET' | 'POST'; body?: unknown },
): Promise<T> {
  return requestJson(path, isPayload, {
    ...(init?.method === undefined ? {} : { method: init.method }),
    ...(init?.body === undefined ? {} : { body: jsonBody(init.body) }),
    ...(init?.signal === undefined ? {} : { signal: init.signal }),
  });
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
