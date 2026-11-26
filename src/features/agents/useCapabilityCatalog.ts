import { useEffect, useState } from 'react';
import { getCapabilityAudit, type CapabilityAudit, type CapabilityGrant } from '../../shared/api/agents.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { capabilityOptions, readCapabilityAudit, type CapabilityOptions } from './agent-capability-catalog.js';

/** Registered tools/Skills plus the current grants of one Agent. */
export function useCapabilityCatalog(agentId: string | undefined, runtime: RuntimeInfo | null) {
  const [audit, setAudit] = useState<CapabilityAudit | null>(null);

  useEffect(() => {
    if (!runtime?.capabilities.includes('agents')) { setAudit(null); return; }
    let active = true;
    getCapabilityAudit()
      .then((value) => { if (active) setAudit(value); })
      .catch(() => { if (active) setAudit(null); });
    return () => { active = false; };
  }, [agentId, runtime]);

  const entry = readCapabilityAudit(audit, agentId ?? '');
  const options: CapabilityOptions = capabilityOptions(
    audit?.available?.tools ?? [],
    audit?.available?.skills ?? [],
    entry?.grants ?? [],
  );
  return { audit, entry, options };
}

export function grantsFromSelection(tools: readonly string[], skills: readonly string[]): CapabilityGrant[] {
  return [
    ...tools.map((name) => ({ kind: 'tool' as const, name })),
    ...skills.map((name) => ({ kind: 'skill' as const, name })),
  ];
}
