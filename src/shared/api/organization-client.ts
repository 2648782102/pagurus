
import {
  ORGANIZATION_CONTRACT_VERSION,
  ORGANIZATION_PUBLIC_PATHS,
  isOrganizationAttentionView,
  isOrganizationDelegationList,
  isOrganizationEventPage,
  isOrganizationIntentResult,
  isOrganizationProjectThreadList,
  isOrganizationReportList,
  isOrganizationSessionView,
  isOrganizationWorkItemList,
  type OrganizationAttentionView,
  type OrganizationDelegationList,
  type OrganizationEventPage,
  type OrganizationIntentInput,
  type OrganizationIntentResult,
  type OrganizationProjectThreadList,
  type OrganizationReportList,
  type OrganizationSessionView,
  type OrganizationWorkItemList,
} from './organization-contract.js';
import { fromRequestInit, requestJson as sendJsonRequest } from './http.js';
import { type RuntimeInfo } from './runtime.js';

/**
 * The Runtime organization client.
 *
 * Reads map one-to-one onto published paths. The only local derivation left
 * here is the event cursor query, because it belongs to the request itself;
 * session projections live in `organization-selectors.ts`.
 */
export function supportsOrganizationContract(runtime: RuntimeInfo | null): boolean {
  return runtime?.organizationContract === ORGANIZATION_CONTRACT_VERSION
    && runtime.organizationPaths === ORGANIZATION_PUBLIC_PATHS.length;
}

export async function requestJson<T>(
  path: string,
  isPayload: (value: unknown) => value is T,
  init?: RequestInit,
): Promise<T> {
  return sendJsonRequest(path, isPayload, {
    ...fromRequestInit(init),
  });
}

export function getOrganizationSession(signal?: AbortSignal): Promise<OrganizationSessionView> {
  return requestJson('/v1/organization/session', isOrganizationSessionView, { signal });
}

export function getOrganizationProjectThreads(
  projectId: string,
  signal?: AbortSignal,
): Promise<OrganizationProjectThreadList> {
  return requestJson(
    `/v1/organization/projects/${encodeURIComponent(projectId)}/threads`,
    isOrganizationProjectThreadList,
    { signal },
  );
}

export function listOrganizationReports(
  signal?: AbortSignal,
): Promise<OrganizationReportList> {
  return requestJson('/v1/organization/reports', isOrganizationReportList, { signal });
}

export function listOrganizationWorkItems(
  signal?: AbortSignal,
): Promise<OrganizationWorkItemList> {
  return requestJson('/v1/organization/work-items', isOrganizationWorkItemList, { signal });
}

export function listOrganizationDelegations(
  signal?: AbortSignal,
): Promise<OrganizationDelegationList> {
  return requestJson('/v1/organization/delegations', isOrganizationDelegationList, { signal });
}

export function getOrganizationAttention(
  attentionId: string,
  signal?: AbortSignal,
): Promise<OrganizationAttentionView> {
  return requestJson(
    `/v1/organization/attention/${encodeURIComponent(attentionId)}`,
    isOrganizationAttentionView,
    { signal },
  );
}

export function getOrganizationEvents(
  after?: string,
  limit = 100,
  signal?: AbortSignal,
): Promise<OrganizationEventPage> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (after) query.set('after', after);
  return requestJson(`/v1/organization/events?${query.toString()}`, isOrganizationEventPage, { signal });
}

export function submitOrganizationIntent(
  intent: OrganizationIntentInput,
  signal?: AbortSignal,
): Promise<OrganizationIntentResult> {
  return requestJson('/v1/organization/session/intents', isOrganizationIntentResult, {
    method: 'POST',
    body: JSON.stringify({ intent }),
    signal,
  });
}

export async function decideOrganizationAttention(
  attentionId: string,
  kind: 'answer' | 'withdraw',
  expectedVersion: number,
  decisionDigest?: string,
  signal?: AbortSignal,
): Promise<OrganizationAttentionView> {
  const payload = {
    expectedVersion,
    ...(decisionDigest ? { decisionDigest } : {}),
  };
  const path = `/v1/organization/attention/${encodeURIComponent(attentionId)}/${kind}`;
  return requestJson(path, isOrganizationAttentionView, { method: 'POST', body: JSON.stringify(payload), signal });
}
