import { useMemo } from 'react';
import type { AgentChatConversationSummary } from '../shared/api/agent-chat.js';
import { groupForRail, shortRelativeTime } from './agent-surface-model.js';
import { AgentIcon } from '../shared/ui/AgentIcon.js';

/** The persistent session rail: one workspace, one list of running threads. */
export function AgentSessionRail({
  conversations,
  activeConversationId,
  onNewThread,
  onResume,
}: {
  readonly conversations: readonly AgentChatConversationSummary[];
  readonly activeConversationId: string | null;
  readonly onNewThread: () => void;
  readonly onResume: (conversationId: string) => void;
}) {
  const groups = useMemo(
    () => groupForRail(conversations.filter((entry) => entry.messageCount > 0)),
    [conversations],
  );
  return (
    <aside className="agent-rail" aria-label="会话">
      <header className="agent-rail-head">
        <span className="agent-rail-brand">pagurus</span>
        <button type="button" className="agent-rail-new" onClick={onNewThread}>
          <AgentIcon name="send" size={13} />
          新对话
        </button>
      </header>
      <nav className="agent-rail-list" aria-label="会话记录">
        {groups.length === 0 ? (
          <p className="agent-rail-empty">还没有对话。</p>
        ) : groups.map((group) => (
          <section key={group.key} aria-labelledby={`rail-${group.key}`}>
            <h2 id={`rail-${group.key}`}>{group.label}</h2>
            <ul>
              {group.items.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={entry.id === activeConversationId ? 'is-active' : ''}
                    aria-current={entry.id === activeConversationId ? 'page' : undefined}
                    onClick={() => onResume(entry.id)}
                    title={entry.lastMessagePreview || '（无标题对话）'}
                  >
                    <span className="agent-rail-title">{railTitle(entry.title ?? entry.lastMessagePreview)}</span>
                    <span className="agent-rail-meta">{shortRelativeTime(entry.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </aside>
  );
}

/** A rail row names a thread; it is not a place to read the reply. */
function railTitle(preview: string): string {
  const firstLine = preview.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? '（无标题对话）';
  return firstLine.length > 34 ? `${firstLine.slice(0, 34).trimEnd()}…` : firstLine;
}
