import type { AgentRecord } from '../../shared/api/agents.js';
import { Button, Field, Select } from '../../shared/ui/primitives.js';

export function AgentPicker({
  agents,
  selectedAgentId,
  busy,
  onSelect,
  onStartNew,
}: {
  readonly agents: readonly AgentRecord[];
  readonly selectedAgentId: string | undefined;
  readonly busy: boolean;
  readonly onSelect: (agentId: string) => void;
  readonly onStartNew: () => void;
}) {
  return (
    <div className="agent-toolbar">
      <Field label="选择 Agent" htmlFor="agent-select">
        <Select
          id="agent-select"
          value={selectedAgentId ?? ''}
          onChange={(event) => onSelect(event.target.value)}
          disabled={busy || agents.length === 0}
        >
          {agents.length === 0 && <option value="">还没有 Agent</option>}
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.current.name}{agent.isDefault ? ' · 默认' : ''}{agent.archived ? ' · 已归档' : ''}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="button" onClick={onStartNew} disabled={busy}>新建 Agent</Button>
    </div>
  );
}
