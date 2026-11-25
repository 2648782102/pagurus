import { useMemo } from 'react';
import type { AgentChatConversation } from '../shared/api/agent-chat.js';
import type { CapabilitySummary } from './useAgentCapabilities.js';
import { buildTimeline, timelineSummary, type TimelineKind } from './conversation-timeline.js';
import { FactList } from '../shared/ui/primitives.js';
import { AgentIcon } from '../shared/ui/AgentIcon.js';

/**
 * What the conversation is, in facts rather than prose.
 *
 * A chat transcript answers "what was said". It cannot answer "which revisions
 * is this pinned to", "what is this Agent allowed to do", or "what has it
 * actually done in this turn" — all of which the Runtime already publishes but
 * the thread has nowhere to put.
 *
 * The panel is read-only on purpose: everything here is a published fact. It
 * never edits a revision, resolves a secret, or grants a capability.
 */
export function AgentContextPanel({
  open,
  conversation,
  capabilities,
  onRefreshCapabilities,
  onClose,
}: {
  readonly open: boolean;
  readonly conversation: AgentChatConversation | null;
  readonly capabilities: CapabilitySummary;
  readonly onRefreshCapabilities: () => void;
  readonly onClose: () => void;
}) {
  const timeline = useMemo(() => buildTimeline(conversation), [conversation]);

  return (
    <aside
      className="agent-context"
      id="agent-context"
      aria-label="对话上下文"
      /*
       * Kept mounted so the chrome's aria-controls has a real target.
       *
       * `hidden` is not used: it sets `display: none`, which ends the closing
       * transition on the first frame — the panel would open smoothly and
       * vanish instantly. `inert` plus `aria-hidden` take the panel out of the
       * accessibility tree and out of the tab order, which is what `hidden`
       * was for, while `data-open` lets the stylesheet animate both directions.
       */
      data-open={open ? 'true' : 'false'}
      inert={!open}
      aria-hidden={!open}
    >
      <div className="agent-context-head">
        <h2>对话上下文</h2>
        <span className="agent-context-mode">Inspect</span>
        <button type="button" className="agent-context-close" onClick={onClose} aria-label="收起上下文">
          <AgentIcon name="close" size={14} />
        </button>
      </div>

      <div className="agent-context-body">
        {conversation === null ? (
          <p className="agent-context-empty">开始一段对话后，这里会列出这次对话固定使用的版本与执行记录。</p>
        ) : (
          <>
            <section className="agent-context-section" aria-labelledby="ctx-pinned">
              <h3 id="ctx-pinned">固定版本</h3>
              <FactList className="agent-context-facts" facts={[
                { label: '模型', value: `${conversation.providerId}:${conversation.modelId}` },
                {
                  label: '思考强度',
                  value: conversation.reasoningEffort === null
                    ? '该模型无档位'
                    : EFFORT[conversation.reasoningEffort] ?? conversation.reasoningEffort,
                },
                { label: 'Agent 版本', value: shortId(conversation.agentRevisionId), code: true, title: conversation.agentRevisionId },
                { label: '配置版本', value: shortId(conversation.configurationRevisionId), code: true, title: conversation.configurationRevisionId },
                { label: '会话', value: shortId(conversation.id), code: true, title: conversation.id },
              ]} />
            </section>

            <section className="agent-context-section" aria-labelledby="ctx-capability">
              <div className="agent-context-section-head">
                <h3 id="ctx-capability">能力边界</h3>
                <button type="button" className="agent-context-mini" onClick={onRefreshCapabilities}>
                  刷新
                </button>
              </div>
              <CapabilityFacts capabilities={capabilities} />
            </section>

            <section className="agent-context-section" aria-labelledby="ctx-activity">
              <div className="agent-context-section-head">
                <h3 id="ctx-activity">发生了什么</h3>
                {timeline.length > 0 && (
                  <span className="agent-context-count">{timelineSummary(timeline)}</span>
                )}
              </div>
              {timeline.length === 0 ? (
                <p className="agent-context-empty">这段对话还没有任何记录。</p>
              ) : (
                <ol className="agent-context-activity">
                  {timeline.map((entry) => (
                    <li key={entry.id} className={`is-${entry.state}`}>
                      <span className="agent-context-activity-row">
                        <span className="agent-context-activity-label">{entry.label}</span>
                        <span className="agent-context-activity-state">{STATE[entry.state] ?? entry.state}</span>
                      </span>
                      <span className="agent-context-activity-kind">{TIMELINE_KIND[entry.kind]}</span>
                      {entry.detail && <code>{entry.detail}</code>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </div>

      <p className="agent-context-note">
        这里只读取 Runtime 已发布的事实；修改 Agent 或运行时策略请到控制台。
      </p>
    </aside>
  );
}

const EFFORT: Readonly<Record<string, string>> = { low: '低', medium: '中', high: '高' };
const TIMELINE_KIND: Readonly<Record<TimelineKind, string>> = {
  user: '你的消息',
  assistant: '回复',
  tool: '工具',
  approval: '审批',
  error: '错误',
};

/**
 * The published activity states, in the reader's words.
 *
 * `waiting_approval` matters most: the run is stopped until the person acts,
 * which a bare "running" label would hide.
 */
const STATE: Readonly<Record<string, string>> = {
  running: '进行中',
  succeeded: '完成',
  failed: '失败',
  waiting_approval: '等待你批准',
  // Timeline states: a turn happened, is blocked, or failed. `pending` comes
  // only from a waiting approval or a still-running tool.
  ok: '完成',
  pending: '等待你批准',
};

/**
 * Shortens a published id without losing what distinguishes it.
 *
 * A tail-only cut produced labels like "…_runtime-v1" that say nothing about
 * which revision they are. Keeping the prefix and the tail preserves both the
 * kind (agr_, cfg_, chat_) and the identifying bytes; the full value stays in
 * the title attribute.
 */
function shortId(value: string): string {
  if (value.length <= 20) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function CapabilityFacts({ capabilities }: { readonly capabilities: CapabilitySummary }) {
  if (capabilities.phase === 'loading') return <p className="agent-context-empty">正在读取…</p>;
  if (capabilities.phase === 'builtin') {
    return (
      <p className="agent-context-empty">
        这是 Runtime 内建的Boss Agent，没有可编辑的 Agent 版本，也没有单独的工具授权。
        它只能提议组织动作，由 Runtime 校验后执行。
      </p>
    );
  }
  if (capabilities.phase === 'error') {
    return <p className="agent-context-empty">读取失败：{capabilities.message}</p>;
  }
  if (capabilities.phase === 'idle') return <p className="agent-context-empty">打开「刷新」读取这个 Agent 的授权。</p>;

  const tools = capabilities.grants.filter((grant) => grant.kind === 'tool');
  const skills = capabilities.grants.filter((grant) => grant.kind === 'skill');
  if (tools.length === 0 && skills.length === 0) {
    return (
      <p className="agent-context-empty">
        没有授权工具或 Skill。这个 Agent 只能用对话回答，不能读文件、执行命令或联网。
      </p>
    );
  }
  return (
    <>
      {tools.length > 0 && (
        <div className="agent-context-grant">
          <span>工具 · {tools.length}</span>
          <ul>{tools.map((grant) => <li key={`tool-${grant.name}`}><code>{grant.name}</code></li>)}</ul>
        </div>
      )}
      {skills.length > 0 && (
        <div className="agent-context-grant">
          <span>Skill · {skills.length}</span>
          <ul>{skills.map((grant) => <li key={`skill-${grant.name}`}><code>{grant.name}</code></li>)}</ul>
        </div>
      )}
      <p className="agent-context-empty">每次写入仍由 Runtime 审批；授权不等于已批准。</p>
    </>
  );
}
