import type { Agent, CapabilityGrant, ProviderModel } from '../../shared/api/agents.js';

/**
 * Agent editor draft rules.
 *
 * These are pure functions over editor text and a published model catalog. They
 * live apart from the controller because the rules — naming, de-duplication,
 * the grant ceiling, and which model reference a revision picks — are the parts
 * a reader needs to verify precisely, and they are the parts worth unit tests.
 */

const CAPABILITY_NAME = /^[a-z0-9][a-z0-9_.-]{0,119}$/;
const MAX_CAPABILITY_GRANTS = 64;

export function grantsToDraft(
  grants: readonly CapabilityGrant[] | undefined,
): { toolNames: string; skillNames: string } {
  const namesOf = (kind: CapabilityGrant['kind']) => (grants ?? [])
    .filter((grant) => grant.kind === kind)
    .map((grant) => grant.name)
    .join('\n');
  return { toolNames: namesOf('tool'), skillNames: namesOf('skill') };
}

export function parseGrantDraft(toolNames: string, skillNames: string): CapabilityGrant[] {
  const parse = (kind: CapabilityGrant['kind'], draft: string): CapabilityGrant[] => {
    const seen = new Set<string>();
    const grants: CapabilityGrant[] = [];
    for (const raw of draft.split(/[\s,]+/)) {
      const name = raw.trim();
      if (name.length === 0) continue;
      if (!CAPABILITY_NAME.test(name)) throw new Error(`能力名「${name}」不符合 Runtime 命名规则。`);
      if (seen.has(name)) throw new Error(`能力「${name}」重复出现。`);
      seen.add(name);
      grants.push({ kind, name });
    }
    return grants;
  };
  const grants = [...parse('tool', toolNames), ...parse('skill', skillNames)];
  if (grants.length > MAX_CAPABILITY_GRANTS) {
    throw new Error(`一个 Agent 最多可授权 ${MAX_CAPABILITY_GRANTS} 项能力。`);
  }
  return grants;
}

/**
 * The model reference a revision points at.
 *
 * An unmatched reference yields an empty string rather than a silent fallback:
 * the editor must show that the published catalog no longer offers the model
 * the revision was pinned to, instead of pretending it is the first entry.
 */
export function selectedModelReference(
  models: readonly ProviderModel[],
  revision: Agent['current'] | undefined,
): string {
  if (!revision) return models[0]?.reference ?? '';
  return models.find((model) =>
    model.providerId === revision.providerId && model.modelId === revision.modelId)?.reference ?? '';
}
