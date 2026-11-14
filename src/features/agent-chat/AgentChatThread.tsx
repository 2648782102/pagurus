import { useEffect, useRef } from 'react';
import type { AgentChatMessage, AgentChatMessageState } from '../../shared/api/agent-chat.js';

interface AgentChatThreadProps {
  readonly messages: readonly AgentChatMessage[];
  readonly agentName: string;
}

const STATE_LABELS: Readonly<Record<AgentChatMessageState, string>> = {
  published: '',
  pending: '正在准备…',
  succeeded: '',
  failed: '回复失败',
  cancelled: '已取消',
  thinking: '正在思考…',
  streaming: '正在回复…',
  organizing: '正在组织工作…',
  waiting_attention: '等待你的确认',
  replied: '',
  unavailable: '模型服务暂不可用',
};

function isWorking(state: AgentChatMessageState): boolean {
  return state === 'thinking' || state === 'streaming' || state === 'organizing' || state === 'pending';
}

function messageBody(message: AgentChatMessage): string {
  if (message.body.length > 0) return message.body;
  if (message.state === 'thinking') return '';
  if (message.state === 'streaming') return '正在生成回复…';
  if (message.state === 'organizing') return '正在校验意图、安排项目与员工，并汇总结果。';
  if (message.state === 'waiting_attention') return '这个任务需要你补充信息。';
  if (message.state === 'failed') return '这条回复失败。';
  if (message.state === 'unavailable') return '模型目录或供应商暂不可用，请检查 Magpie 配置。';
  if (message.state === 'cancelled') return '这条回复已取消。';
  return '';
}

export function AgentChatThread({ messages, agentName }: AgentChatThreadProps) {
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
              <span className="agent-chat-state-label" role="status">{STATE_LABELS[message.state]}</span>
            )}
          </div>
          {isWorking(message.state) && <div className="agent-chat-typing" aria-hidden="true"><i /><i /><i /></div>}
          {messageBody(message).length > 0 && (
            <p>{messageBody(message)}{message.state === 'streaming' && <span className="agent-chat-caret" aria-hidden="true" />}</p>
          )}
          {message.progress !== null && message.progress > 0 && message.progress < 100 && (
            <div className="agent-chat-progress" aria-label={`回复进度 ${message.progress}%`}>
              <span style={{ width: `${message.progress}%` }} />
            </div>
          )}
          {message.error && <small>{message.error}</small>}
        </article>
      ))}
    </div>
  );
}
