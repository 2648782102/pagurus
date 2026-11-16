import { useMemo, useState } from 'react';
import type {
  AgentChatAgent,
  AgentChatConversationSummary,
} from '../shared/api/agent-chat.js';
import type { RuntimeConnectionState } from '../features/runtime-status/useRuntimeStatus.js';
import { conversationTitle, groupForRail, shortRelativeTime } from './agent-surface-model.js';

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

/**
 * Session rail for the shipped Agent app.
 *
 * This is the shell interaction users expect from a chat product: one primary
 * action, a searchable session list grouped by recency, and a quiet footer.
 * It deliberately shows no runtime diagnostics — those stay in the console.
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
  const [query, setQuery] = useState('');

  // Only threads that contain something are worth resuming; an empty thread is
  // a launch the user abandoned.
  const history = useMemo(
    () => conversations.filter((entry) => entry.agentId === activeAgentId && entry.messageCount > 0),
    [conversations, activeAgentId],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return history;
    return history.filter((entry) => {
      const title = conversationTitle(entry.lastMessagePreview, entry.messageCount).toLowerCase();
      return title.includes(needle);
    });
  }, [history, query]);

  const groups = useMemo(() => groupForRail(filtered), [filtered]);

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
          <label className="agent-rail-search">
            <span className="sr-only">搜索对话</span>
            <input
              type="search"
              value={query}
              placeholder="搜索对话"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

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

          <section className="agent-rail-section agent-rail-sessions" aria-labelledby="agent-rail-history">
            <h2 id="agent-rail-history">最近对话</h2>
            {groups.length === 0 ? (
              <p className="agent-rail-empty">
                {history.length === 0 ? '还没有对话记录。' : '没有匹配的对话。'}
              </p>
            ) : groups.map((group) => (
              <div className="agent-rail-group" key={group.key}>
                <h3>{group.label}</h3>
                <ul className="agent-rail-list">
                  {group.items.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className={`agent-rail-item agent-rail-thread${entry.id === activeConversationId ? ' is-active' : ''}`}
                        onClick={() => void onResume(entry.id)}
                        aria-current={entry.id === activeConversationId ? 'true' : undefined}
                        title={conversationTitle(entry.lastMessagePreview, entry.messageCount)}
                      >
                        <span className="agent-rail-copy">
                          <strong>{conversationTitle(entry.lastMessagePreview, entry.messageCount)}</strong>
                          <small>{shortRelativeTime(entry.createdAt)}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
