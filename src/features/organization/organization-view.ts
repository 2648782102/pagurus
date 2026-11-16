import type {
  OrganizationAttentionRecord,
  OrganizationEventRecord,
  OrganizationSessionView,
  OrganizationWorkItemRecord,
} from '../../shared/api/organization.js';
import {
  listOrganizationAttentionFrom,
  listOrganizationDelegationsFrom,
  listOrganizationReportsFrom,
  organizationAttentionDetail,
  organizationWorkerProposals,
  organizationWorkItems,
} from '../../shared/api/organization.js';

/**
 * Pure transformations of organization state.
 *
 * The console polls every four seconds, so merging and projecting run often and
 * must be obvious. Keeping them out of the hook makes them directly testable
 * and prevents a rendering change from altering merge behaviour.
 */

export function latestEventCursor(events: readonly OrganizationEventRecord[]): string | null {
  return events.length === 0 ? null : events[events.length - 1]!.id;
}

/**
 * Incremental polls append pages. Events are identified by their published id,
 * so a replayed page must not duplicate a row, and the result stays in the
 * Runtime-published sequence order regardless of arrival order.
 */
export function mergeOrganizationEvents(
  existing: readonly OrganizationEventRecord[],
  incoming: readonly OrganizationEventRecord[],
  mode: 'full' | 'incremental',
): readonly OrganizationEventRecord[] {
  if (mode === 'full') {
    return Object.freeze([...incoming].sort((left, right) => left.sequence - right.sequence));
  }
  const merged = [...existing, ...incoming].filter((event, index, all) =>
    all.findIndex((candidate) => candidate.id === event.id) === index);
  return Object.freeze(merged.sort((left, right) => left.sequence - right.sequence));
}

/** Keeps a still-valid selection; otherwise lands on the first published project. */
export function resolveSelectedProjectId(
  session: OrganizationSessionView,
  currentProjectId: string,
): string {
  return session.projects.some((project) => project.id === currentProjectId)
    ? currentProjectId
    : session.projects[0]?.id ?? '';
}

export function firstOpenAttentionId(session: OrganizationSessionView): string | null {
  return session.attentionRequests.find((request) => request.state === 'open')?.id ?? null;
}

export interface OrganizationView {
  readonly selectedAttention: OrganizationAttentionRecord | undefined;
  readonly orderedAttention: readonly OrganizationAttentionRecord[];
  readonly projects: OrganizationSessionView['projects'];
  readonly proposals: ReturnType<typeof organizationWorkerProposals>;
  readonly delegations: ReturnType<typeof listOrganizationDelegationsFrom>['delegations'];
  readonly workItems: readonly OrganizationWorkItemRecord[];
  readonly reports: ReturnType<typeof listOrganizationReportsFrom>['reports'];
  readonly recentEvents: readonly OrganizationEventRecord[];
  readonly timeline: readonly OrganizationEventRecord[];
}

/**
 * Everything the panel renders, derived once per session/event change.
 *
 * Live work items win over the worker-derived fallback, because the work-items
 * route is the published source when the Runtime provides it.
 */
export function deriveOrganizationView(
  session: OrganizationSessionView | null,
  events: readonly OrganizationEventRecord[],
  selectedAttentionId: string,
  workItemViews: readonly OrganizationWorkItemRecord[],
): OrganizationView {
  const timeline = Object.freeze([...events].sort((left, right) => left.sequence - right.sequence));
  const recentEvents = Object.freeze([...timeline].slice(-24).reverse());
  if (session === null) {
    return {
      selectedAttention: undefined,
      orderedAttention: [],
      projects: [],
      proposals: [],
      delegations: [],
      workItems: workItemViews,
      reports: [],
      recentEvents,
      timeline,
    };
  }
  return {
    selectedAttention: organizationAttentionDetail(session, selectedAttentionId),
    orderedAttention: listOrganizationAttentionFrom(session).attentionRequests,
    projects: session.projects,
    proposals: organizationWorkerProposals(session),
    delegations: listOrganizationDelegationsFrom(session).delegations,
    workItems: workItemViews.length > 0 ? workItemViews : organizationWorkItems(session).workItems,
    reports: listOrganizationReportsFrom(session).reports,
    recentEvents,
    timeline,
  };
}
