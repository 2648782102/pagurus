import { isRecord, isStringArray } from './guards.js';

export const ORGANIZATION_CONTRACT_VERSION = '1.1.0';
export const ORGANIZATION_PUBLIC_PATHS = Object.freeze([
  '/v1/organization/session',
  '/v1/organization/session/intents',
  '/v1/organization/projects',
  '/v1/organization/projects/{projectId}',
  '/v1/organization/projects/{projectId}/threads',
  '/v1/organization/agents/proposals',
  '/v1/organization/agents/proposals/{proposalId}',
  '/v1/organization/delegations',
  '/v1/organization/delegations/{delegationId}',
  '/v1/organization/work-items',
  '/v1/organization/work-items/{workItemId}',
  '/v1/organization/reports',
  '/v1/organization/reports/{reportId}',
  '/v1/organization/attention',
  '/v1/organization/attention/{attentionId}',
  '/v1/organization/attention/{attentionId}/answer',
  '/v1/organization/attention/{attentionId}/withdraw',
  '/v1/organization/events',
] as const);

export interface OrganizationVersioned {
  readonly version: typeof ORGANIZATION_CONTRACT_VERSION;
}

export interface OrganizationSessionRecord {
  readonly version: 1;
  readonly id: string;
  readonly state: 'active';
  readonly projectIds: readonly string[];
}

export interface OrganizationProjectRecord {
  readonly version: 1;
  readonly id: string;
  readonly bossSessionId: string;
  readonly originTriggerId: string;
  readonly state: string;
}

export interface OrganizationDelegationRecord {
  readonly version: 1;
  readonly id: string;
  readonly projectId: string;
  readonly parentDelegationId: string | null;
  readonly workerId: string;
  readonly scope: readonly string[];
  readonly capabilities: readonly string[];
  readonly maxDelegationDepth: number;
  readonly expiresAtSequence: number;
  readonly authorizationDigest: string;
  readonly state: string;
}

export interface OrganizationWorkerRecord {
  readonly version: 1;
  readonly id: string;
  readonly projectId: string;
  readonly delegationId: string;
  readonly agentRevisionId: string;
  readonly displayName: string;
  readonly instructionsDigest: string;
  readonly model: { readonly providerId: string; readonly modelId: string };
  readonly state: string;
}

export interface OrganizationReportRecord {
  readonly version: 1;
  readonly id: string;
  readonly projectId: string;
  readonly workerId: string;
  readonly state: string;
  readonly summaryDigest: string;
  readonly sequence: number;
}

export interface OrganizationAttentionRecord {
  readonly version: 1;
  readonly id: string;
  readonly projectId: string;
  readonly workerId: string;
  readonly state: string;
  readonly questionDigest: string;
  readonly sequence: number;
  readonly expectedVersion: number;
}

export interface OrganizationSessionView extends OrganizationVersioned {
  readonly bossSession: OrganizationSessionRecord;
  readonly projects: readonly OrganizationProjectRecord[];
  readonly delegations: readonly OrganizationDelegationRecord[];
  readonly workers: readonly OrganizationWorkerRecord[];
  readonly reports: readonly OrganizationReportRecord[];
  readonly attentionRequests: readonly OrganizationAttentionRecord[];
}

export interface OrganizationProjectThreadList extends OrganizationVersioned {
  readonly projectId: string;
  readonly threads: readonly { readonly eventId: string; readonly sequence: number; readonly type: string }[];
}

export interface OrganizationAgentProposalList extends OrganizationVersioned {
  readonly proposals: readonly {
    readonly workerId: string;
    readonly projectId: string;
    readonly agentRevisionId: string;
    readonly instructionsDigest: string;
    readonly state: string;
  }[];
}

export interface OrganizationDelegationList extends OrganizationVersioned {
  readonly delegations: readonly OrganizationDelegationRecord[];
}

export interface OrganizationWorkItemRecord {
  readonly workItemId: string;
  readonly projectId: string;
  readonly workerId: string;
  readonly state: string;
}

export interface OrganizationWorkItemList extends OrganizationVersioned {
  readonly workItems: readonly OrganizationWorkItemRecord[];
}

export interface OrganizationReportList extends OrganizationVersioned {
  readonly reports: readonly OrganizationReportRecord[];
}

export interface OrganizationAttentionList extends OrganizationVersioned {
  readonly attentionRequests: readonly OrganizationAttentionRecord[];
}

export interface OrganizationAttentionView extends OrganizationVersioned {
  readonly attentionRequest: OrganizationAttentionRecord;
}

export interface OrganizationIntentResult extends OrganizationVersioned {
  readonly intentId: string;
  readonly state: 'accepted';
  readonly expectedSequence: number;
}

export interface OrganizationEventRecord {
  readonly id: string;
  readonly sequence: number;
  readonly type: string;
  readonly projectId: string;
  readonly data: Readonly<Record<string, string | number | boolean>>;
  readonly expectedVersion: number;
}

export interface OrganizationEventPage extends OrganizationVersioned {
  readonly events: readonly OrganizationEventRecord[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

export interface OrganizationIntentInput {
  readonly text: string;
  readonly idempotencyKey: string;
}

function isVersioned(value: unknown): value is OrganizationVersioned {
  return isRecord(value) && value.version === ORGANIZATION_CONTRACT_VERSION;
}

function isBoundedString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 240;
}

function isProject(value: unknown): value is OrganizationProjectRecord {
  return isRecord(value) && value.version === 1 && isBoundedString(value.id)
    && typeof value.bossSessionId === 'string' && typeof value.originTriggerId === 'string'
    && typeof value.state === 'string';
}

function isDelegation(value: unknown): value is OrganizationDelegationRecord {
  return isRecord(value) && value.version === 1 && isBoundedString(value.id)
    && typeof value.projectId === 'string' && typeof value.workerId === 'string'
    && (value.parentDelegationId === null || typeof value.parentDelegationId === 'string')
    && isStringArray(value.scope) && isStringArray(value.capabilities)
    && Number.isInteger(value.maxDelegationDepth) && Number.isInteger(value.expiresAtSequence)
    && typeof value.authorizationDigest === 'string' && typeof value.state === 'string';
}

function isWorker(value: unknown): value is OrganizationWorkerRecord {
  return isRecord(value) && value.version === 1 && isBoundedString(value.id)
    && typeof value.projectId === 'string' && typeof value.delegationId === 'string'
    && typeof value.agentRevisionId === 'string' && typeof value.displayName === 'string'
    && typeof value.instructionsDigest === 'string' && typeof value.state === 'string'
    && isRecord(value.model) && typeof value.model.providerId === 'string'
    && typeof value.model.modelId === 'string';
}

function isReport(value: unknown): value is OrganizationReportRecord {
  return isRecord(value) && value.version === 1 && isBoundedString(value.id)
    && typeof value.projectId === 'string' && typeof value.workerId === 'string'
    && typeof value.state === 'string' && typeof value.summaryDigest === 'string'
    && Number.isInteger(value.sequence);
}

function isAttention(value: unknown): value is OrganizationAttentionRecord {
  return isRecord(value) && value.version === 1 && isBoundedString(value.id)
    && typeof value.projectId === 'string' && typeof value.workerId === 'string'
    && typeof value.state === 'string' && typeof value.questionDigest === 'string'
    && Number.isInteger(value.sequence) && Number.isInteger(value.expectedVersion);
}

function isEvent(value: unknown): value is OrganizationEventRecord {
  return isRecord(value) && isBoundedString(value.id) && Number.isInteger(value.sequence)
    && typeof value.type === 'string' && typeof value.projectId === 'string'
    && isRecord(value.data) && Object.values(value.data).every(
      (entry) => typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean',
    ) && Number.isInteger(value.expectedVersion);
}

export function isOrganizationSessionView(value: unknown): value is OrganizationSessionView {
  return isVersioned(value) && isRecord(value)
    && isRecord(value.bossSession) && isStringArray(value.bossSession.projectIds)
    && Array.isArray(value.projects) && value.projects.every(isProject)
    && Array.isArray(value.delegations) && value.delegations.every(isDelegation)
    && Array.isArray(value.workers) && value.workers.every(isWorker)
    && Array.isArray(value.reports) && value.reports.every(isReport)
    && Array.isArray(value.attentionRequests) && value.attentionRequests.every(isAttention);
}

export function isOrganizationEventPage(value: unknown): value is OrganizationEventPage {
  return isVersioned(value) && isRecord(value) && Array.isArray(value.events)
    && value.events.every(isEvent)
    && (value.nextCursor === null || typeof value.nextCursor === 'string')
    && typeof value.hasMore === 'boolean';
}

export function isOrganizationIntentResult(value: unknown): value is OrganizationIntentResult {
  return isVersioned(value) && isRecord(value) && typeof value.intentId === 'string'
    && value.state === 'accepted' && Number.isInteger(value.expectedSequence);
}

export function isOrganizationProjectThreadList(value: unknown): value is OrganizationProjectThreadList {
  return isVersioned(value) && isRecord(value) && isBoundedString(value.projectId)
    && Array.isArray(value.threads) && value.threads.every((thread) => isRecord(thread)
      && isBoundedString(thread.eventId) && Number.isInteger(thread.sequence)
      && typeof thread.type === 'string');
}

export function isOrganizationReportList(value: unknown): value is OrganizationReportList {
  return isVersioned(value) && isRecord(value) && Array.isArray(value.reports)
    && value.reports.every(isReport);
}

export function isOrganizationWorkItemList(value: unknown): value is OrganizationWorkItemList {
  return isVersioned(value) && isRecord(value) && Array.isArray(value.workItems)
    && value.workItems.every((item) => isRecord(item)
      && isBoundedString(item.workItemId) && isBoundedString(item.projectId)
      && isBoundedString(item.workerId) && typeof item.state === 'string');
}

export function isOrganizationDelegationList(value: unknown): value is OrganizationDelegationList {
  return isVersioned(value) && isRecord(value) && Array.isArray(value.delegations)
    && value.delegations.every(isDelegation);
}

export function isOrganizationAttentionView(value: unknown): value is OrganizationAttentionView {
  return isVersioned(value) && isRecord(value) && isAttention(value.attentionRequest);
}
