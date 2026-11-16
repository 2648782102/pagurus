import type {
  AgentChatAgent,
  AgentChatConversationSummary,
} from '../shared/api/agent-chat.js';
import type { RuntimeConnectionState } from '../features/runtime-status/useRuntimeStatus.js';

interface AgentSidebarProps {
  readonly open: boolean;
  readonly agents: readonly AgentChatAgent[];
  readonly conversations: readonly AgentChatConversationSummary[];
  readonly activeAgentId: string;
  readonly activeConversationId: string | null;
  readonly connection: string;
  readonly connectionState: RuntimeConnectionState;
  readonly onToggle: () => void;
  readonly onSelectAgent: (agentId: string) => void;
  readonly onResume: (conversationId: string) => Promise<void>;
  readonly onNew: () => void;
}

function formatRelative(value: string): string {
  const then = Date.parse(value);
  if (Number.isNaN(then)) return '';
  const minutes = Math.floor((Date.now() - then) / 60_000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} 天前` : `${Math.floor(days / 30)} 个月前`;
}

/**
 * Identity rail for the shipped Agent app.
 *
 * The console rail lists every operator workspace. This rail lists only what a
 * user needs: who they can talk to, what they talked about recently, and one
 * primary action. Runtime health is reported as a single status line, not as a
 * diagnostic panel.
 */
export function AgentSidebar({
  open,
  agents,
  conversations,
  activeAgentId,
  activeConversationId,
  connection,
  connectionState,
  onToggle,
  onSelectAgent,
  onResume,
  onNew,
}: AgentSidebarProps) {
  // An empty conversation is an abandoned launch, not a thread worth resuming.
  const history = conversations.filter((entry) => entry.agentId === activeAgentId && entry.messageCount > 0);

  return (
    <aside className={`agent-sidebar${open ? '' : ' is-collapsed'}`} aria-label="Agent 导航">
      <div className="agent-sidebar-head">
        <span className="agent-brand-mark" aria-hidden="true">P</span>
        {open && (
          <div className="agent-brand-copy">
            <strong>pagurus</strong>
            <small>寄居蟹</small>
          </div>
        )}
        <button
          type="button"
          className="agent-rail-toggle"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? '收起侧栏' : '展开侧栏'}
        >
          {open ? '‹' : '›'}
        </button>
      </div>

      <button type="button" className="agent-new-chat" onClick={onNew} aria-label="开始新对话">
        <span aria-hidden="true">＋</span>{open && '新对话'}
      </button>

      {open && (
        <>
          <section className="agent-rail-section" aria-labelledby="agent-rail-agents">
            <h2 id="agent-rail-agents">Agent</h2>
            {agents.length === 0 ? (
              <p className="agent-rail-empty">还没有可用的 Agent。</p>
            ) : (
              <ul className="agent-rail-list">
                {agents.map((agent) => (
                  <li key={agent.id}>
                    <button
                      type="button"
                      className={`agent-rail-item${agent.id === activeAgentId ? ' is-active' : ''}`}
                      onClick={() => onSelectAgent(agent.id)}
                      aria-current={agent.id === activeAgentId ? 'true' : undefined}
                    >
                      <span className="agent-rail-avatar" aria-hidden="true">{agent.name.slice(0, 1)}</span>
                      <span className="agent-rail-copy">
                        <strong>{agent.name}</strong>
                        <small>{agent.providerId}:{agent.modelId}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="agent-rail-section" aria-labelledby="agent-rail-history">
            <h2 id="agent-rail-history">最近对话</h2>
            {history.length === 0 ? (
              <p className="agent-rail-empty">还没有对话记录。</p>
            ) : (
              <ul className="agent-rail-list">
                {history.slice(0, 20).map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={`agent-rail-item agent-rail-thread${entry.id === activeConversationId ? ' is-active' : ''}`}
                      onClick={() => void onResume(entry.id)}
                      aria-current={entry.id === activeConversationId ? 'true' : undefined}
                    >
                      <span className="agent-rail-copy">
                        <strong>{entry.lastMessagePreview || '（空会话）'}</strong>
                        <small>{formatRelative(entry.createdAt)}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <div className="agent-sidebar-foot">
        <span className={`agent-connection status-${connectionState}`} role="status">
          <span className="agent-connection-dot" aria-hidden="true" />
          {open && connection}
        </span>
        {open && <a className="agent-console-link" href="?surface=console">打开控制台</a>}
      </div>
    </aside>
  );
}
