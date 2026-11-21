import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AgentChatAgent,
  AgentChatConversationSummary,
} from '../shared/api/agent-chat.js';
import { conversationTitle, groupForRail, shortRelativeTime } from './agent-surface-model.js';

/**
 * Threads, on demand.
 *
 * A permanent rail was the wrong shape: it framed every visit as "manage your
 * history" when most visits are "finish a thought". The list still matters, so
 * it slides in over the reading column, keyboard-dismissable, and closes the
 * moment a thread is chosen.
 */
export function AgentThreadDrawer({
  open,
  agents,
  conversations,
  activeAgentId,
  activeConversationId,
  onClose,
  onSelectAgent,
  onResume,
}: {
  readonly open: boolean;
  readonly agents: readonly AgentChatAgent[];
  readonly conversations: readonly AgentChatConversationSummary[];
  readonly activeAgentId: string;
  readonly activeConversationId: string | null;
  readonly onClose: () => void;
  readonly onSelectAgent: (agentId: string) => void;
  readonly onResume: (conversationId: string) => Promise<void>;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');

  // A modal sheet has to take focus, or a keyboard user is stuck on the page
  // behind it. Returning focus to the trigger happens in the shell, which owns
  // the button that opened this.
  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [onClose, open]);

  // Only threads with content; an empty one is a launch the person abandoned.
  const history = useMemo(
    () => conversations.filter((entry) => entry.agentId === activeAgentId && entry.messageCount > 0),
    [conversations, activeAgentId],
  );

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle.length === 0
      ? history
      : history.filter((entry) =>
        conversationTitle(entry.lastMessagePreview, entry.messageCount).toLowerCase().includes(needle));
    return groupForRail(filtered);
  }, [history, query]);

  if (!open) return null;

  return (
    <div className="agent-drawer-layer anim-fade-in">
      <div
        className="agent-drawer anim-slide-in"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="对话记录"
      >
        <div className="agent-drawer-head">
          <h2>对话记录</h2>
          <button type="button" className="agent-drawer-close" onClick={onClose} aria-label="关闭对话记录">
            ✕
          </button>
        </div>

        <label className="agent-drawer-search">
          <span className="sr-only">搜索对话</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="搜索对话"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        {agents.length > 1 && (
          <div className="agent-drawer-agents" role="group" aria-label="按 Agent 筛选">
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={`agent-drawer-agent${agent.id === activeAgentId ? ' is-active' : ''}`}
                onClick={() => onSelectAgent(agent.id)}
                aria-pressed={agent.id === activeAgentId}
              >
                {agent.name}
              </button>
            ))}
          </div>
        )}

        <div className="agent-drawer-body">
          {groups.length === 0 ? (
            <p className="agent-drawer-empty">
              {history.length === 0 ? '还没有对话。' : '没有匹配的对话。'}
            </p>
          ) : groups.map((group) => (
            <section className="agent-drawer-group" key={group.key} aria-labelledby={`drawer-${group.key}`}>
              <h3 id={`drawer-${group.key}`}>{group.label}</h3>
              <ul>
                {group.items.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={`agent-drawer-thread${entry.id === activeConversationId ? ' is-active' : ''}`}
                      onClick={() => { onClose(); void onResume(entry.id); }}
                      aria-current={entry.id === activeConversationId ? 'true' : undefined}
                    >
                      <span className="agent-drawer-thread-title">
                        {conversationTitle(entry.lastMessagePreview, entry.messageCount)}
                      </span>
                      <span className="agent-drawer-thread-meta">{shortRelativeTime(entry.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="agent-drawer-foot">
          <a href="?surface=console">打开控制台</a>
        </div>
      </div>
    </div>
  );
}
