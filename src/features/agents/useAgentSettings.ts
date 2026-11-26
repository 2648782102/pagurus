import { useEffect, useState } from 'react';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { getAgent, type Agent, type ProviderModel } from '../../shared/api/agents.js';
import { loadAgentCatalog } from '../../shared/api/agent-catalog.js';

export interface AgentSettingsState {
  readonly agents: readonly { id: string; name: string }[];
  readonly models: readonly ProviderModel[];
  readonly selected: Agent | null;
  readonly error: string | null;
}

/** Loads the Agent list and the selected revision for the settings panel. */
export function useAgentSettings(runtime: RuntimeInfo | null, selectedId: string) {
  const [state, setState] = useState<AgentSettingsState>({
    agents: [], models: [], selected: null, error: null,
  });

  useEffect(() => {
    if (!runtime) return;
    let active = true;
    loadAgentCatalog()
      .then(async (catalog) => {
        if (!active) return;
        if (!catalog.supportsAgents) {
          setState({ agents: [], models: [], selected: null, error: '当前 Runtime 未开放 Agent 管理' });
          return;
        }
        const agents = catalog.agents.map((agent) => ({ id: agent.id, name: agent.current.name }));
        const first = catalog.agents.find((agent) => agent.id === selectedId)
          ?? catalog.agents.find((agent) => agent.id === catalog.defaultAgentId)
          ?? catalog.agents[0];
        const detail = first ? await getAgent(first.id) : null;
        if (!active) return;
        setState({ agents, models: catalog.models, selected: detail, error: null });
      })
      .catch((cause: unknown) => {
        if (active) setState({ agents: [], models: [], selected: null,
          error: cause instanceof Error ? cause.message : 'Agent 配置读取失败' });
      });
    return () => { active = false; };
  }, [runtime, selectedId]);

  return state;
}
