import type { AgentRevision, CapabilityGrant } from '../../shared/api/agents.js';

export function earliestRevision(
  revisions: readonly AgentRevision[],
): AgentRevision | undefined {
  return revisions.reduce<AgentRevision | undefined>((earliest, revision) => {
    if (!earliest || revision.createdAt < earliest.createdAt) return revision;
    return earliest;
  }, undefined);
}

export function formatGrants(grants: readonly CapabilityGrant[] | undefined): string {
  if (!grants || grants.length === 0) return '未授权任何能力';
  return grants.map((grant) => `${grant.kind}:${grant.name}`).join('\n');
}
