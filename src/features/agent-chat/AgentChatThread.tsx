import { useEffect, useRef } from 'react';
import type { AgentChatMessage } from '../../shared/api/agent-chat.js';

interface AgentChatThreadProps {
  readonly messages: readonly AgentChatMessage[];
  readonly agentName: string;
}

function messageBody(message: AgentChatMessage): string {
  if (message.body.length > 0) return message.body;
  if (message.state === 'pending') return '正在回复…';
  if (message.state === 'failed') return '这条回复失败。';
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
        <article className={`agent-chat-message agent-chat-message-${message.author}`} key={message.id}>
          <div className="agent-chat-message-author">
            {message.author === 'user' ? '你' : message.author === 'assistant' ? agentName : 'Runtime'}
          </div>
          <p>{messageBody(message)}</p>
          {message.error && <small>{message.error}</small>}
        </article>
      ))}
    </div>
  );
}
