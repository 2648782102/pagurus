import {
  getDefaultAgent,
  listAgents,
  listProviderModels,
  supportsAgentManagement,
  type AgentRecord,
  type ProviderModel,
} from './agents.js';
import { listModels } from './tasks.js';

/**
 * The agents a model can be chosen for, and the models to choose from.
 *
 * Two panels want this and asked for it separately: the Agents editor and the
 * task composer each issued `listProviderModels` + `listAgents` +
 * `getDefaultAgent` on their own mount. Same three requests, same answer, twice
 * over — and they could disagree for as long as one was in flight.
 *
 * The legacy branch is part of the shape, not a fallback bolted on here: a
 * Runtime without Agent management publishes one flat model list, and a
 * conversation over it still needs a provider/model reference. Both panels had
 * written that mapping out identically; this is that mapping, once.
 */
export interface AgentCatalog {
  /** False when the Runtime has no Agent management, so only models apply. */
  readonly supportsAgents: boolean;
  readonly agents: readonly AgentRecord[];
  readonly models: readonly ProviderModel[];
  readonly defaultAgentId: string | null;
}

export async function loadAgentCatalog(signal?: AbortSignal): Promise<AgentCatalog> {
  const supportsAgents = await supportsAgentManagement(signal);
  if (!supportsAgents) {
    /*
     * An older Runtime with no Agent management. Whether that means "read the
     * flat model list instead" or "this panel has nothing to show" is the
     * caller's question, not this function's: the composer falls back to the
     * legacy models, while the Agent editor stops. Deciding it here made the
     * editor issue a request the Runtime does not serve.
     */
    return { supportsAgents: false, agents: [], models: [], defaultAgentId: null };
  }
  /*
   * Three independent reads, settled together. The order they are issued in is
   * not a property of the answer — but it is observable to anything that stubs
   * the transport call by call, which both callers' tests do. They stubbed
   * different orders, which means neither was testing this function, only the
   * sequence it happened to use. One order now, and the tests follow it.
   */
  const [agents, models, defaultAgent] = await Promise.all([
    listAgents(signal),
    listProviderModels(signal),
    getDefaultAgent(signal),
  ]);
  return {
    supportsAgents: true,
    agents,
    models,
    defaultAgentId: defaultAgent?.id ?? null,
  };
}

/**
 * The flat model list an older Runtime publishes, as catalogue-shaped models.
 *
 * Only for the fallback path above: a Runtime without Agent management
 * publishes one list of model ids, and a composer over it still needs a
 * provider/model reference to work with.
 */
export async function loadLegacyModels(signal?: AbortSignal): Promise<readonly ProviderModel[]> {
  const legacy = await listModels(signal);
  return legacy.map((entry) => ({
    providerId: 'magpie',
    modelId: entry.id,
    reference: `magpie:${entry.id}`,
    displayName: entry.displayName,
    capabilities: ['chat'],
    legacyId: entry.id,
  }));
}

/** The agents that can take work, in the order the Runtime listed them. */
export function selectableAgents(catalog: AgentCatalog): readonly AgentRecord[] {
  return catalog.agents.filter((agent) => !agent.archived);
}

/**
 * Which Agent a panel should land on, given what the reader last had open.
 *
 * Keep the reader's choice while it is still selectable; otherwise the
 * Runtime's default; otherwise the first one that is not archived. Written as
 * one rule because the two panels had two, and their two disagreed about what
 * happens when the remembered Agent is archived.
 */
export function preferredAgentId(catalog: AgentCatalog, remembered: string): string {
  const selectable = selectableAgents(catalog);
  if (selectable.some((agent) => agent.id === remembered)) return remembered;
  if (catalog.defaultAgentId !== null && selectable.some((agent) => agent.id === catalog.defaultAgentId)) {
    return catalog.defaultAgentId;
  }
  return selectable[0]?.id ?? '';
}
