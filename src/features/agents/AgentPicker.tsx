import type { useAgents } from './useAgents.js';
import { Button, Field, Select } from '../../shared/ui/primitives.js';

type AgentsController = ReturnType<typeof useAgents>;

export function AgentPicker({ agents, busy }: { readonly agents: AgentsController; readonly busy: boolean }) {
  const selected = agents.selected;
  return (
    <div className="agent-toolbar">
      <Field label="选择 Agent" htmlFor="agent-select">
        <Select
          id="agent-select"
          value={selected?.id ?? ''}
          onChange={(event) => agents.select(event.target.value)}
          disabled={busy || agents.agents.length === 0}
        >
          {agents.agents.length === 0 && <option value="">还没有 Agent</option>}
          {agents.agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.current.name}{agent.isDefault ? ' · 默认' : ''}{agent.archived ? ' · 已归档' : ''}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="button" onClick={agents.startNew} disabled={busy}>新建 Agent</Button>
    </div>
  );
}
