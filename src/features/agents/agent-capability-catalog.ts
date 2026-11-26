import type { CapabilityGrant } from '../../shared/api/agents.js';

export interface CapabilityAuditGrant extends CapabilityGrant {
  readonly stillAvailable: boolean;
}

export interface CapabilityAuditEntry {
  readonly agentId: string;
  readonly currentRevisionId: string;
  readonly archived: boolean;
  readonly grants: readonly CapabilityAuditGrant[];
}

export interface CapabilityAudit {
  readonly version: 1;
  readonly agents: readonly CapabilityAuditEntry[];
  readonly staleGrants: readonly {
    readonly agentId: string;
    readonly revisionId: string;
    readonly kind: CapabilityGrant['kind'];
    readonly name: string;
  }[];
  readonly available?: {
    readonly tools: readonly string[];
    readonly skills: readonly string[];
  };
}

export interface CapabilityOption {
  readonly name: string;
  readonly available: boolean;
}

export interface CapabilityOptions {
  readonly tools: readonly CapabilityOption[];
  readonly skills: readonly CapabilityOption[];
}

export function readCapabilityAudit(
  audit: CapabilityAudit | null,
  agentId: string,
): CapabilityAuditEntry | null {
  return audit?.agents.find((entry) => entry.agentId === agentId) ?? null;
}

export function capabilityOptions(
  availableTools: readonly string[],
  availableSkills: readonly string[],
  grants: readonly CapabilityAuditGrant[],
): CapabilityOptions {
  const build = (kind: CapabilityGrant['kind'], available: readonly string[]): readonly CapabilityOption[] => {
    const names = [...available];
    for (const grant of grants) {
      if (grant.kind === kind && !names.includes(grant.name)) names.push(grant.name);
    }
    return names.map((name) => Object.freeze({ name, available: available.includes(name) }));
  };
  return Object.freeze({
    tools: build('tool', availableTools),
    skills: build('skill', availableSkills),
  });
}
