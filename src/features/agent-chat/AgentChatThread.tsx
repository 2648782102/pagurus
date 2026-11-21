import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  AgentChatActivity,
  AgentChatMessage,
  AgentChatMessageState,
} from '../../shared/api/agent-chat.js';
import { Button, StatusDot } from '../../shared/ui/primitives.js';
import { concurrentTurnIds } from './concurrent-turns.js';

interface AgentChatThreadProps {
  readonly messages: readonly AgentChatMessage[];
  readonly agentName: string;
  readonly busy: boolean;
  readonly onDecision: (assistantMessageId: string, decision: 'approved' | 'rejected') => void;
  /**
   * Optional trailing actions for a settled assistant message.
   *
   * The console has no use for these, and the product wants copy/retry next to
   * a reply. Passing a slot instead of a flag keeps the operator surface
   * unchanged and avoids two message renderers drifting apart.
   */
  readonly renderMessageActions?: (message: AgentChatMessage) => ReactNode;
  /**
   * Optional body renderer, used by the product surface to render structure
   * (fenced code, lists) that the console deliberately leaves as plain text.
   * The default keeps every existing caller byte-for-byte unchanged.
   */
  readonly renderBody?: (message: AgentChatMessage, body: string) => ReactNode;
  /**
   * Turns a message's `modelReference` into the name shown beside the author.
   *
   * Passed in rather than looked up here: the thread has no catalogue, and the
   * caller already holds one. Returning `null` hides the note, which is what a
   * reply without a recorded model gets — inventing the conversation's current
   * model would misattribute every older turn after a switch.
   */
  readonly renderModelNote?: (message: AgentChatMessage) => ReactNode;
  /** Reports whether the reader is still following the newest turn. */
  readonly onPinnedChange?: (pinned: boolean) => void;
  /**
   * Rendered inside the scrolling column, pinned above its lower edge.
   *
   * It belongs here rather than beside the composer so it cannot overlap it:
   * the column ends where the composer begins, whatever height the composer
   * has grown to. As a sibling with `position: absolute` it sat 96px above the
   * panel's bottom — the composer at one line — so a six-line draft covered
   * the control whose job is to reach the message underneath it.
   */
  readonly overlay?: ReactNode;
}

const STATE_LABELS: Readonly<Record<AgentChatMessageState, string>> = {
  published: '',
  pending: '正在准备…',
  succeeded: '',
  failed: '回复失败',
  cancelled: '已取消',
  thinking: '正在思考…',
  streaming: '正在回复…',
  organizing: '正在执行组织动作…',
  waiting_approval: '等待你批准工具调用',
  waiting_attention: '等待你的确认',
  replied: '',
  // No label: `done` says "finished, unread" for the Runtime's benefit. To a
  // reader looking at the thread it is simply a reply that is there.
  done: '',
  unavailable: '模型服务暂不可用',
};

function isWorking(state: AgentChatMessageState): boolean {
  return state === 'thinking' || state === 'streaming' || state === 'organizing'
    || state === 'pending';
}

/**
 * A reply the Runtime has accepted but not started.
 *
 * A turn asked while another is running is queued, and the Runtime writes it
 * as `pending` with no task. A task is assigned when the turn leaves the queue,
 * and the state becomes `thinking` in the same write — so "pending and no task"
 * means "waiting its turn", not "being prepared".
 *
 * The distinction matters with more than one question in a row: three of them
 * are three rows saying "准备中" while only one is being worked on.
 */
function isQueued(message: AgentChatMessage): boolean {
  return message.state === 'pending' && message.taskId === null;
}

/**
 * States where the caret belongs at the end of the text.
 *
 * Only once there is text to sit after: during preparation the typing dots are
 * the right signal, and a caret next to nothing just looks broken.
 */
function isStreamingText(state: AgentChatMessageState): boolean {
  return state === 'streaming' || state === 'thinking' || state === 'organizing';
}

function statusTone(state: AgentChatMessageState): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (state === 'failed' || state === 'cancelled' || state === 'unavailable') return 'danger';
  if (state === 'waiting_approval' || state === 'waiting_attention') return 'warning';
  if (state === 'thinking' || state === 'streaming' || state === 'organizing' || state === 'pending') return 'info';
  if (state === 'replied' || state === 'done') return 'success';
  return 'neutral';
}

function messageBody(message: AgentChatMessage): string {
  if (message.body.length > 0) return message.body;
  if (message.state === 'thinking') return '';
  if (message.state === 'streaming') return '正在生成回复…';
  if (message.state === 'organizing') return 'Runtime 正在校验并执行你确认的组织动作。';
  if (message.state === 'waiting_approval') return 'Agent 想执行一个写入工具，需要你的批准。';
  if (message.state === 'waiting_attention') return '这个任务需要你补充信息。';
  if (message.state === 'failed') return '这条回复失败。';
  if (message.state === 'unavailable') return '模型目录或供应商暂不可用，请检查 Magpie 配置。';
  if (message.state === 'cancelled') return '这条回复已取消。';
  return '';
}

/**
 * A Runtime close-out report is published as ordinary Boss text today, because
 * the organization contract does not expose the structured document. Render
 * the published sections as blocks without inventing any new facts. Once a
 * public read model exists, this fallback can be replaced by typed data.
 */
function closeOutSections(body: string): readonly { readonly title: string; readonly lines: readonly string[] }[] | null {
  if (!/^项目 .+：/.test(body)) return null;
  const sections: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line === '成果：' || line === '遗留问题：' || line === '如需继续：') {
      current = { title: line.slice(0, -1), lines: [] };
      sections.push(current);
      continue;
    }
    if (line.startsWith('- ') && current) {
      current.lines.push(line.slice(2));
      continue;
    }
    if (sections.length === 0) continue;
    return null;
  }
  return sections.length > 0 ? sections : null;
}

/**
 * Splits the published activity into the pending decision and everything else.
 *
 * The Runtime publishes the approval and its bounded preview as ordinary
 * activity entries. Three consumers need them: the card below, the button
 * gate, and the remaining list. One helper keeps them from disagreeing about
 * which entry is "the" approval.
 */
function pendingApprovalParts(message: AgentChatMessage): {
  readonly requested: boolean;
  readonly approval: AgentChatActivity | null;
  readonly preview: AgentChatActivity | null;
  readonly rest: readonly AgentChatActivity[];
} {
  const requested = message.state === 'waiting_approval' && message.taskId !== null;
  if (!requested) return { requested, approval: null, preview: null, rest: message.activity };
  const approval = [...message.activity].reverse().find((entry) => entry.kind === 'approval'
    && entry.state === 'waiting_approval') ?? null;
  const preview = approval
    ? message.activity.find((entry) => entry.kind === 'output' && entry.label === '将要发生的改动') ?? null
    : null;
  const promoted = new Set([approval?.id, preview?.id].filter((id): id is string => id !== undefined));
  return {
    requested,
    approval,
    preview,
    rest: message.activity.filter((entry) => !promoted.has(entry.id)),
  };
}

/**
 * The change that is waiting for a decision.
 *
 * Rendering the preview as an ordinary list row made the one thing the reader
 * must judge the least prominent text in the message. The facts are the same
 * published ones; only the weight changes.
 */
function PendingApproval({
  message,
  approval,
  preview,
  busy,
  onDecision,
}: {
  readonly message: AgentChatMessage;
  readonly approval: AgentChatActivity | null;
  readonly preview: AgentChatActivity | null;
  readonly busy: boolean;
  readonly onDecision: (assistantMessageId: string, decision: 'approved' | 'rejected') => void;
}) {
  const approvalBlockedId = useId();
  return (
    <section className="agent-chat-approval" aria-label="待批准的改动">
      <p className="agent-chat-approval-kicker">需要你的批准</p>
      {approval && <h4 className="agent-chat-approval-title">{approval.label}</h4>}
      {approval?.detail && <p className="agent-chat-approval-risk">{approval.detail}</p>}
      {preview?.detail && (
        <figure className="agent-chat-approval-preview">
          <figcaption>{preview.label}</figcaption>
          <pre><code>{preview.detail}</code></pre>
        </figure>
      )}
      <div className="agent-chat-approval-actions">
        {/*
         * `busy` means a request is in flight somewhere in this conversation,
         * not that this message is waiting for a decision — a reader can be
         * sending a new message while an older task sits blocked on approval.
         * It is also not `disabled`: that removes the button from the tab
         * order, and the approval is the only way to unblock the task, so a
         * keyboard reader would have no way out. Same treatment as the Send
         * button: stay focusable, and decline the click.
         */}
        <Button variant="primary" size="sm" type="button"
          aria-disabled={busy}
          aria-describedby={busy ? approvalBlockedId : undefined}
          onClick={() => { if (busy) return; onDecision(message.id, 'approved'); }}>批准并继续</Button>
        <Button size="sm" type="button"
          aria-disabled={busy}
          aria-describedby={busy ? approvalBlockedId : undefined}
          onClick={() => { if (busy) return; onDecision(message.id, 'rejected'); }}>拒绝</Button>
        {/*
         * The visual state already says "not now", but not *why*. A tooltip
         * covers a mouse reader; this covers everyone else, including a screen
         * reader, which announces it as the buttons' description.
         */}
        {busy && (
          <p id={approvalBlockedId} className="sr-only">上一条消息正在发送，稍后即可处理这次审批。</p>
        )}
      </div>
    </section>
  );
}

export function AgentChatThread({
  messages,
  agentName,
  busy,
  onDecision,
  renderMessageActions,
  renderBody,
  renderModelNote,
  onPinnedChange,
  overlay,
}: AgentChatThreadProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);
  /*
   * A question asked while an earlier reply was still being written is shown
   * as such, because the two replies were each written without the other and
   * would otherwise read as one exchange. Derived from published timestamps, so
   * it survives a reload. See `concurrent-turns.ts`.
   */
  const concurrentIds = useMemo(() => concurrentTurnIds(messages), [messages]);

  /*
   * Follow the newest turn, but only when the reader is already at the bottom.
   *
   * A new message scrolls smoothly, because the jump is the only part of the
   * arrival the reader can feel; a streaming update sets the position directly,
   * because a smooth scroll restarted on every frame never finishes and reads
   * as the view bouncing while text is appended.
   *
   * `reducedMotion` disables the smooth variant — the OS setting is about not
   * being moved, and a scroll animation counts.
   */
  const previousCountRef = useRef(messages.length);
  /*
   * History is drawn quiet; only what arrives afterwards animates.
   *
   * The arrival animation says "this appeared in the thread". Reopening a
   * conversation mounts every message at once, so all of them played it
   * together and the whole column faded in and rose 6px — a repaint, not an
   * arrival. The first render flips this, and CSS keeps quiet for anything
   * already mounted.
   */
  const [settled, setSettled] = useState(false);
  useEffect(() => { setSettled(true); }, []);
  /*
   * The ids present on the first render never animate. Anything else does —
   * the class is decided per message, so flipping `is-settled` cannot restart
   * an animation on a row that was already drawn.
   */
  const initialIdsRef = useRef<ReadonlySet<string> | null>(null);
  if (initialIdsRef.current === null) initialIdsRef.current = new Set(messages.map((m) => m.id));
  useEffect(() => {
    const container = containerRef.current;
    const previousCount = previousCountRef.current;
    previousCountRef.current = messages.length;
    if (!container || !nearBottomRef.current) return;
    const grew = messages.length > previousCount;
    const reduced = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (grew && !reduced && typeof container.scrollTo === 'function') {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  /*
   * The composer grows with the draft, so the thread box shrinks under it. A
   * reader who was at the bottom would otherwise find the last lines hidden
   * behind a taller input, with no scroll event to correct it.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (nearBottomRef.current) container.scrollTop = container.scrollHeight;
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    /*
     * The scrolling column and anything pinned above it share one box, so the
     * overlay's lower edge is the column's — where the composer begins, at any
     * composer height. The overlay is a sibling of the scroll container, not a
     * child: a child would scroll away with the messages.
     */
    <div className="agent-thread-column">
      <div
        className={`agent-chat-thread${settled ? ' is-settled' : ''}`}
        ref={containerRef}
      /*
       * `off`, not `polite`: a streaming body changes on every frame, and a live
       * region would queue an announcement per frame, which is unusable with a
       * screen reader. New turns are announced by the state label instead.
       */
        aria-live="off"
        aria-label="Agent 对话消息"
        onScroll={() => {
          const container = containerRef.current;
          if (!container) return;
          const pinned = container.scrollHeight - container.scrollTop - container.clientHeight < 96;
          nearBottomRef.current = pinned;
          onPinnedChange?.(pinned);
        }}
      >
      {messages.length === 0 && (
        <div className="agent-chat-empty" role="status">
          <p className="agent-chat-empty-title">开始一段对话</p>
          <p>直接说出你的想法。Runtime 会调用选中的 Agent，并把回复发布到这里。</p>
        </div>
      )}
      {messages.map((message) => {
        const parts = pendingApprovalParts(message);
        const concurrent = concurrentIds.has(message.id);
        /*
         * Only a row that was not in the first render may animate. Reopening a
         * conversation mounts every message in one pass; without this, all of
         * them play the arrival together and the column reads as a repaint.
         */
        const arriving = settled && !(initialIdsRef.current?.has(message.id) ?? true);
        return (
          <article
            /*
             * `anim-rise` comes from the motion library rather than a rule here:
             * the movement is "content appearing in place", which is a library
             * entry, not a property of a chat message. `is-arriving` stays as the
             * hook for which messages get it.
             */
            className={`agent-chat-message agent-chat-message-${message.author} agent-chat-state-${message.state}${concurrent ? ' is-concurrent' : ''}${arriving ? ' is-arriving anim-rise' : ''}`}
            key={message.id}
            aria-busy={isWorking(message.state)}
          >
            <div className="agent-chat-message-meta">
              <span className="agent-chat-message-author">
                {message.author === 'user' ? '你' : message.author === 'assistant' ? agentName : 'Runtime'}
              </span>
              {/*
               * Which model wrote this one. A conversation can switch models
               * between turns, so the answer above a switch was written by a
               * different model than the one the composer now shows; without
               * this the transcript silently re-attributes every earlier reply.
               */}
              {renderModelNote?.(message)}
              {/*
               * Facts only, and one that stayed true when the Runtime changed:
               * this question was submitted while the reply above it was still
               * being written.
               *
               * It used to say more than that — "上一条回复还在生成" — and the
               * reader was meant to conclude the two replies did not know about
               * each other, because that was true: a second turn started its
               * own task. Turns are queued now, and the queued one is given the
               * transcript as it stands when it runs, answer included. The old
               * wording would now assert the opposite of what happened.
               */}
              {concurrent && (
                <span className="agent-chat-concurrent-note">上一条回复生成中时发出</span>
              )}
              {STATE_LABELS[message.state] && (
                <span className="agent-chat-state-label" role="status">
                  <StatusDot tone={statusTone(message.state)} />
                  {isQueued(message) ? '排队中，等上一条回复完成' : STATE_LABELS[message.state]}
                </span>
              )}
            </div>
            {isWorking(message.state) && <div className="agent-chat-typing" aria-hidden="true"><i /><i /><i /></div>}
            {messageBody(message).length > 0 && (
              (() => {
                const body = messageBody(message);
                if (renderBody) {
                  return (
                    <>
                      {renderBody(message, body)}
                      {isStreamingText(message.state) && <span className="agent-chat-caret" aria-hidden="true" />}
                    </>
                  );
                }
                const sections = closeOutSections(body);
                if (!sections) {
                  return <p>{body}{message.state === 'streaming' && <span className="agent-chat-caret" aria-hidden="true" />}</p>;
                }
                const headline = body.split('\n')[0] ?? '';
                return (
                  <div className="agent-chat-report">
                    <p className="agent-chat-report-headline">{headline}</p>
                    {sections.map((section) => (
                      <section key={section.title} className="agent-chat-report-section">
                        <h3>{section.title}</h3>
                        <ul>
                          {section.lines.map((line, index) => <li key={`${section.title}-${index}`}>{line}</li>)}
                        </ul>
                      </section>
                    ))}
                  </div>
                );
              })()
            )}
            {message.progress !== null && message.progress > 0 && message.progress < 100 && (
              <div className="agent-chat-progress" aria-label={`回复进度 ${message.progress}%`}>
                <span style={{ width: `${message.progress}%` }} />
              </div>
            )}
            {parts.rest.length > 0 && (
              <ul className="agent-chat-activity" aria-label="Agent 执行活动">
                {parts.rest.map((entry) => (
                  <li key={entry.id} className={`agent-chat-activity-${entry.state}`}>
                    <span className="agent-chat-activity-label">{entry.label}</span>
                    {entry.detail && <code>{entry.detail}</code>}
                  </li>
                ))}
              </ul>
            )}
            {parts.requested && (
              <PendingApproval
                message={message}
                approval={parts.approval}
                preview={parts.preview}
                busy={busy}
                onDecision={onDecision}
              />
            )}
            {message.error && <small>{message.error}</small>}
            {renderMessageActions?.(message)}
          </article>
        );
      })}
      </div>
      {overlay}
    </div>
  );
}
