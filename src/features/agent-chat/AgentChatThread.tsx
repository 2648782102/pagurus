import { useEffect, useRef } from 'react';
import type { AgentChatMessage, AgentChatMessageState } from '../../shared/api/agent-chat.js';
import { Button, StatusDot } from '../../shared/ui/primitives.js';

interface AgentChatThreadProps {
  readonly messages: readonly AgentChatMessage[];
  readonly agentName: string;
  readonly busy: boolean;
  readonly onDecision: (assistantMessageId: string, decision: 'approved' | 'rejected') => void;
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
  unavailable: '模型服务暂不可用',
};

function isWorking(state: AgentChatMessageState): boolean {
  return state === 'thinking' || state === 'streaming' || state === 'organizing'
    || state === 'pending';
}

function statusTone(state: AgentChatMessageState): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (state === 'failed' || state === 'cancelled' || state === 'unavailable') return 'danger';
  if (state === 'waiting_approval' || state === 'waiting_attention') return 'warning';
  if (state === 'thinking' || state === 'streaming' || state === 'organizing' || state === 'pending') return 'info';
  if (state === 'replied') return 'success';
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

export function AgentChatThread({ messages, agentName, busy, onDecision }: AgentChatThreadProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !nearBottomRef.current) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  return (
    <div
      className="agent-chat-thread"
      ref={containerRef}
      aria-live="polite"
      aria-label="Agent 对话消息"
      onScroll={() => {
        const container = containerRef.current;
        if (!container) return;
        nearBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 96;
      }}
    >
      {messages.length === 0 && (
        <div className="agent-chat-empty" role="status">
          <p className="agent-chat-empty-title">开始一段对话</p>
          <p>直接说出你的想法。Runtime 会调用选中的 Agent，并把回复发布到这里。</p>
        </div>
      )}
      {messages.map((message) => (
        <article
          className={`agent-chat-message agent-chat-message-${message.author} agent-chat-state-${message.state}`}
          key={message.id}
          aria-busy={isWorking(message.state)}
        >
          <div className="agent-chat-message-meta">
            <span className="agent-chat-message-author">
              {message.author === 'user' ? '你' : message.author === 'assistant' ? agentName : 'Runtime'}
            </span>
            {STATE_LABELS[message.state] && (
              <span className="agent-chat-state-label" role="status">
                <StatusDot tone={statusTone(message.state)} />
                {STATE_LABELS[message.state]}
              </span>
            )}
          </div>
          {isWorking(message.state) && <div className="agent-chat-typing" aria-hidden="true"><i /><i /><i /></div>}
          {messageBody(message).length > 0 && (
            (() => {
              const body = messageBody(message);
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
          {message.activity.length > 0 && (
            <ul className="agent-chat-activity" aria-label="Agent 执行活动">
              {message.activity.map((entry) => (
                <li key={entry.id} className={`agent-chat-activity-${entry.state}`}>
                  <span className="agent-chat-activity-label">{entry.label}</span>
                  {entry.detail && <code>{entry.detail}</code>}
                </li>
              ))}
            </ul>
          )}
          {message.state === 'waiting_approval' && message.taskId !== null && (
            <div className="agent-chat-approval-actions">
              <Button variant="primary" size="sm" type="button" disabled={busy}
                onClick={() => onDecision(message.id, 'approved')}>批准并继续</Button>
              <Button size="sm" type="button" disabled={busy}
                onClick={() => onDecision(message.id, 'rejected')}>拒绝</Button>
            </div>
          )}
          {message.error && <small>{message.error}</small>}
        </article>
      ))}
    </div>
  );
}
