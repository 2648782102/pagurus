import { useState } from 'react';
import type { AgentChatMessage } from '../shared/api/agent-chat.js';

/**
 * Trailing actions for a settled assistant reply.
 *
 * Only actions the Runtime can actually honour appear here. A retry button
 * would need a new conversation-level write that the published contract does
 * not expose, so it is deliberately absent rather than silently broken.
 */
export function AgentMessageActions({
  message,
}: {
  readonly message: AgentChatMessage;
}) {
  const [copied, setCopied] = useState(false);
  const settled = message.author === 'assistant'
    && message.body.trim().length > 0
    && (message.state === 'replied' || message.state === 'succeeded');
  if (!settled) return null;

  return (
    <div className="agent-message-actions">
      <button
        type="button"
        className={`agent-message-action${copied ? ' is-copied' : ''}`}
        aria-label="复制回复"
        onClick={() => {
          void navigator.clipboard?.writeText(message.body).then(
            () => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            },
            () => undefined,
          );
        }}
      >
        <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
        <span className="agent-message-action-text">{copied ? '已复制' : '复制'}</span>
      </button>
    </div>
  );
}
