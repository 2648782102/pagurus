import { AgentWorkspace } from '../features/agents/AgentWorkspace.js';
import { AgentChatPanel } from '../features/agent-chat/AgentChatPanel.js';
import { CapabilityPanel } from '../features/capabilities/CapabilityPanel.js';
import { ConfigurationPanel } from '../features/configuration/ConfigurationPanel.js';
import { RuntimeDataPanel } from '../features/runtime-status/RuntimeDataPanel.js';
import { ExecutionConsolePanel } from '../features/execution/ExecutionConsolePanel.js';
import { OrganizationConsolePanel } from '../features/organization/OrganizationConsolePanel.js';
import { SecretHandlePanel } from '../features/secrets/SecretHandlePanel.js';
import { TaskHistoryPanel } from '../features/task-history/TaskHistoryPanel.js';
import { TaskOperationsPanel } from '../features/task-operations/TaskOperationsPanel.js';
import { AttentionWorkbenchPanel } from '../features/work/AttentionWorkbenchPanel.js';
import type { RuntimeInfo } from '../shared/api/runtime.js';
import type { WorkspaceId } from './useWorkspace.js';

export function WorkspaceContent({
  id,
  runtime,
  agentRefreshToken,
  onAgentsChanged,
}: {
  readonly id: WorkspaceId;
  readonly runtime: RuntimeInfo | null;
  readonly agentRefreshToken: number;
  readonly onAgentsChanged: () => void;
}) {
  switch (id) {
    case 'organization':
      return <OrganizationConsolePanel runtime={runtime} />;
    case 'agentChat':
      return <AgentChatPanel runtime={runtime} />;
    case 'execution':
      return <ExecutionConsolePanel runtime={runtime} />;
    case 'agents':
      return <AgentWorkspace onAgentsChanged={onAgentsChanged} />;
    case 'tasks':
      return <>
        <TaskOperationsPanel agentRefreshToken={agentRefreshToken} />
        <TaskHistoryPanel />
      </>;
    case 'work':
      return <AttentionWorkbenchPanel runtime={runtime} />;
    case 'capabilities':
      return <CapabilityPanel runtime={runtime} />;
    case 'secrets':
      return <SecretHandlePanel runtime={runtime} />;
    case 'settings':
      return <>
        <ConfigurationPanel />
        <RuntimeDataPanel runtime={runtime} />
      </>;
    default:
      return null;
  }
}
