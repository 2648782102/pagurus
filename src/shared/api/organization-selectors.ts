import {
  ORGANIZATION_CONTRACT_VERSION,
  type OrganizationAgentProposalList,
  type OrganizationAttentionList,
  type OrganizationAttentionRecord,
  type OrganizationDelegationList,
  type OrganizationReportList,
  type OrganizationSessionView,
  type OrganizationWorkItemList,
} from './organization-contract.js';

/**
 * Pure projections of one organization session.
 *
 * These read a payload the Runtime already published; they are not a second
 * source of truth and they never reorder published identity. Keeping them out
 * of the HTTP client means a presentation tweak cannot change a request.
 */

export function organizationAttentionDetail(
  session: OrganizationSessionView,
  attentionId: string,
): OrganizationAttentionRecord | undefined {
  return session.attentionRequests.find((request) => request.id === attentionId);
}

/** Open attention sorts first, then by the Runtime-published sequence. */
export function listOrganizationAttentionFrom(
  session: OrganizationSessionView,
): OrganizationAttentionList {
  return Object.freeze({
    version: ORGANIZATION_CONTRACT_VERSION,
    attentionRequests: [...session.attentionRequests].sort((left, right) =>
      Number(right.state === 'open') - Number(left.state === 'open') || left.sequence - right.sequence),
  });
}

export function listOrganizationReportsFrom(session: OrganizationSessionView): OrganizationReportList {
  return Object.freeze({ version: ORGANIZATION_CONTRACT_VERSION, reports: session.reports });
}

export function listOrganizationDelegationsFrom(
  session: OrganizationSessionView,
): OrganizationDelegationList {
  return Object.freeze({ version: ORGANIZATION_CONTRACT_VERSION, delegations: session.delegations });
}

export function organizationWorkerProposals(
  session: OrganizationSessionView,
): OrganizationAgentProposalList['proposals'] {
  return session.workers.map((worker) => Object.freeze({
    workerId: worker.id,
    projectId: worker.projectId,
    agentRevisionId: worker.agentRevisionId,
    instructionsDigest: worker.instructionsDigest,
    state: worker.state,
  }));
}

export function organizationWorkItems(
  session: OrganizationSessionView,
): OrganizationWorkItemList {
  return Object.freeze({
    version: ORGANIZATION_CONTRACT_VERSION,
    workItems: session.workers.map((worker) => Object.freeze({
      workItemId: `work_${worker.id}`,
      projectId: worker.projectId,
      workerId: worker.id,
      state: worker.state,
    })),
  });
}
