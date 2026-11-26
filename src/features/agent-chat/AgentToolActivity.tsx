import { useState } from 'react';
import type { AgentChatActivity, AgentChatMessageState } from '../../shared/api/agent-chat.js';
import { DisclosureRow } from '../../dsh/primitives/DisclosureRow.js';
import { StateDot, type StateDotState } from '../../dsh/primitives/StateDot.js';
import { TextShimmer } from '../../dsh/primitives/TextShimmer.js';
import { IconLayersOutlineRegular } from '../../dsh/primitives/icons/index.js';

// A turn that still needs the reader must never hide its steps.
const RUNNING = new Set(['pending', 'thinking', 'streaming', 'organizing', 'waiting_approval', 'waiting_attention']);

const STATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  running: '进行中', succeeded: '已完成', failed: '失败', waiting_approval: '等待批准',
});

/**
 * DSH's own state vocabulary, not a colour of our own.
 *
 * The vendored `StateDot` publishes five states — done, warning, ongoing,
 * error, idle — and the Runtime's activity states map onto them one to one, so
 * a Boss step and a DSH step read the same way.
 */
function dotState(state: string): StateDotState {
  if (state === 'succeeded') return 'done';
  if (state === 'failed') return 'error';
  if (state === 'waiting_approval') return 'warning';
  if (state === 'running') return 'ongoing';
  return 'idle';
}

/**
 * One turn's tool work, drawn with DSH's process-row primitive.
 *
 * This is the vendored component, not an imitation: a 24px tertiary row with a
 * shimmering title while it runs, a chevron revealed on hover, and the steps
 * mounted only when the reader opens them. A Boss turn that called four tools
 * says "4 个步骤" instead of pushing the answer down a screen.
 */
export function AgentToolActivity({
  entries,
  turnState,
}: {
  readonly entries: readonly AgentChatActivity[];
  readonly turnState: AgentChatMessageState;
}) {
  const running = RUNNING.has(turnState);
  const [open, setOpen] = useState(false);
  const expanded = running || open;
  if (entries.length === 0) return null;
  const failed = entries.filter((entry) => entry.state === 'failed').length;
  const runningCount = entries.filter((entry) => entry.state === 'running').length;
  const summary = running
    ? `正在执行 ${entries.length} 个步骤${runningCount > 0 ? ` · ${runningCount} 个进行中` : ''}`
    : `${entries.length} 个步骤${failed > 0 ? ` · ${failed} 个失败` : ''}`;

  return (
    <div className="agent-dsh-activity">
      <DisclosureRow
        icon={<IconLayersOutlineRegular size={14} />}
        title={summary}
        open={expanded}
        expandable
        expandOnRowClick
        previewChevron
        running={running}
        onToggle={() => setOpen((value) => !value)}
      >
        <ul className="agent-dsh-activity-list" aria-label="Agent 执行活动">
          {entries.map((entry) => (
            <li key={entry.id} data-state={entry.state}>
              <StateDot state={dotState(entry.state)} />
              <TextShimmer active={entry.state === 'running'} className="agent-dsh-activity-label">
                {entry.label}
              </TextShimmer>
              <span className="agent-dsh-activity-state">
                {STATE_LABELS[entry.state] ?? entry.state}
              </span>
              {entry.detail && <code>{entry.detail}</code>}
            </li>
          ))}
        </ul>
      </DisclosureRow>
    </div>
  );
}
