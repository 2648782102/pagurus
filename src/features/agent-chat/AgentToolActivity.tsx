import { useState } from 'react';
import type { AgentChatActivity, AgentChatMessageState } from '../../shared/api/agent-chat.js';

// A turn that still needs the reader must never hide its steps.
const RUNNING = new Set(['pending', 'thinking', 'streaming', 'organizing', 'waiting_approval', 'waiting_attention']);

const STATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  running: '进行中', succeeded: '已完成', failed: '失败', waiting_approval: '等待批准',
});

/**
 * One turn's tool work, in the shape DSH uses: a single disclosure line while
 * the turn is settled, and the individual steps only when the reader asks for
 * them. A Boss turn that called four tools should not push the answer down a
 * screen; it should say "4 个步骤" and open on demand.
 */
export function AgentToolActivity({
  entries,
  turnState,
}: {
  readonly entries: readonly AgentChatActivity[];
  readonly turnState: AgentChatMessageState;
}) {
  const running = RUNNING.has(turnState);
  const [expanded, setExpanded] = useState(false);
  const open = running || expanded;
  if (entries.length === 0) return null;
  const failed = entries.filter((entry) => entry.state === 'failed').length;
  const summary = running
    ? `正在执行 ${entries.length} 个步骤…`
    : `${entries.length} 个步骤${failed > 0 ? ` · ${failed} 个失败` : ''}`;

  return (
    <section className="agent-tool-activity" data-open={open || undefined}>
      <button
        type="button"
        className="agent-tool-summary"
        aria-expanded={open}
        aria-controls={`tool-activity-${entries[0]!.id}`}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className={`agent-tool-pulse${running ? ' is-running' : ''}`} aria-hidden="true" />
        <span>{summary}</span>
        <span className="agent-tool-chevron" aria-hidden="true">⌄</span>
      </button>
      {open && (
        <ul id={`tool-activity-${entries[0]!.id}`} className="agent-tool-list" aria-label="Agent 执行活动">
          {entries.map((entry) => (
            <li key={entry.id} className={`is-${entry.state}`}>
              <span className="agent-tool-dot" aria-hidden="true" />
              <span className="agent-tool-label">{entry.label}</span>
              <span className="agent-tool-state">{STATE_LABELS[entry.state] ?? entry.state}</span>
              {entry.detail && <code>{entry.detail}</code>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
