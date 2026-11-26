import { useMemo, useState } from 'react';
import type { AgentChatConversationSummary } from '../shared/api/agent-chat.js';
import { groupForRail, shortRelativeTime } from './agent-surface-model.js';
import { IconNewChatOutlineRegular } from '../dsh/primitives/icons/index.js';
import { SearchField } from '../dsh/primitives/SearchField.js';
import { Button } from '../dsh/primitives/Button.js';

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
  const [filter, setFilter] = useState('');
  const query = filter.trim().toLowerCase();
  const groups = useMemo(
    () => groupForRail(conversations.filter((entry) => {
      if (entry.messageCount === 0) return false;
      if (query.length === 0) return true;
      const title = entry.title ?? entry.lastMessagePreview;
      return title.toLowerCase().includes(query);
    })),
    [conversations, query],
  );
  return (
    <aside className="agent-rail" aria-label="会话">
      <header className="agent-rail-head">
        <span className="agent-rail-brand">pagurus</span>
        <Button
          className="agent-rail-new"
          variant="outline"
          size="sm"
          icon={<IconNewChatOutlineRegular size={14} />}
          onClick={onNewThread}
        >
          新对话
        </Button>
        {/*
         * Only once there is something to filter. An empty rail with a search
         * box asks the reader to search a list they can see is empty.
         */}
        {conversations.length > 6 && (
          /*
           * DSH's own search atom, not a hand-rolled field: the leading
           * magnifier, the clear affordance, and the focus ring are the same
           * ones used inside DSH's menus.
           */
          <SearchField
            className="agent-rail-filter"
            aria-label="筛选会话"
            placeholder="筛选会话…"
            value={filter}
            onChange={setFilter}
            {...(filter.length > 0 ? { clearLabel: '清除筛选' } : {})}
            onClear={() => setFilter('')}
          />
        )}
      </header>
      <nav className="agent-rail-list" aria-label="会话记录">
        {groups.length === 0 ? (
          <p className="agent-rail-empty">
            {query.length > 0 ? '没有匹配的会话。' : '还没有对话。'}
          </p>
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
