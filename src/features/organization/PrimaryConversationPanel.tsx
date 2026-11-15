import type { RuntimeInfo } from '../../shared/api/runtime.js';
import {
  conversationKindLabel,
  conversationMessageLabel,
  type ConversationMessage,
} from '../../shared/api/conversation.js';
import { usePrimaryConversation } from './usePrimaryConversation.js';
import { Button, Field, Textarea } from '../../shared/ui/primitives.js';

interface PrimaryConversationPanelProps {
  readonly runtime: RuntimeInfo | null;
  readonly intentText: string;
  readonly busy: boolean;
  readonly onIntentTextChange: (value: string) => void;
  readonly onSubmitIntent: () => Promise<void>;
  readonly onDecideAttention: (
    attentionId: string,
    expectedVersion: number,
    kind: 'answer' | 'withdraw',
  ) => Promise<void>;
}

function authorClass(message: ConversationMessage): string {
  return `conversation-message conversation-message-${message.author} conversation-message-${message.kind}`;
}

export function PrimaryConversationPanel({
  runtime,
  intentText,
  busy,
  onIntentTextChange,
  onSubmitIntent,
  onDecideAttention,
}: PrimaryConversationPanelProps) {
  const conversation = usePrimaryConversation(runtime);

  return (
    <section className="conversation-panel" aria-labelledby="primary-conversation-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PRIMARY CONVERSATION · 1.4.0</p>
          <h3 id="primary-conversation-title">老板 Agent 主会话</h3>
        </div>
        <div className="history-heading-actions">
          <span className="muted-label">
            {conversation.refreshing ? '同步中…' : conversation.lastUpdatedAt ? `已同步 ${conversation.lastUpdatedAt.slice(11, 19)}` : '等待 Runtime'}
          </span>
          <Button size="sm" type="button" onClick={conversation.refresh}
            disabled={!conversation.supported || conversation.refreshing}>
            刷新对话
          </Button>
        </div>
      </div>

      {!conversation.supported && (
        <div className="work-notice" role="status">
          <p>当前 Runtime 未发布 <code>conversationContract: 1.4.0</code>；下方保留组织状态卡片的只读模式。</p>
        </div>
      )}
      {conversation.error && <div className="work-error" role="alert"><p>{conversation.error}</p></div>}

      {conversation.supported && <>
        <div className="conversation-thread" aria-live="polite" aria-label="主会话消息">
          {conversation.loading && <p className="task-hint" role="status">正在读取 Runtime 发布的主会话…</p>}
          {!conversation.loading && conversation.messages.length === 0 && (
            <p className="task-hint">还没有消息。向老板 Agent 说一句话，Runtime 会发布用户消息、回执和员工进展。</p>
          )}
          {conversation.messages.map((message) => (
            <article className={authorClass(message)} key={message.id}>
              <header>
                <strong>{conversationMessageLabel(message)}</strong>
                <span>{conversationKindLabel(message)}</span>
                <code>#{message.sequence}</code>
              </header>
              <p>{message.body}</p>
              <footer>
                <span>{message.state}</span>
                {message.projectId && <code>{message.projectId}</code>}
                {message.attentionId && message.state === 'open' && message.expectedVersion !== null && <>
                  <Button size="sm" variant="primary" type="button" disabled={busy}
                    onClick={() => onDecideAttention(message.attentionId!, message.expectedVersion!, 'answer')}>回答</Button>
                  <Button size="sm" type="button" disabled={busy}
                    onClick={() => onDecideAttention(message.attentionId!, message.expectedVersion!, 'withdraw')}>撤回</Button>
                </>}
              </footer>
            </article>
          ))}
        </div>

        <form className="conversation-composer" onSubmit={(event) => {
          event.preventDefault();
          if (!busy && intentText.trim().length > 0) void onSubmitIntent();
        }}>
          <Field label="给老板 Agent 发消息" htmlFor="primary-conversation-intent">
          <Textarea
            id="primary-conversation-intent"
            value={intentText}
            onChange={(event) => onIntentTextChange(event.target.value)}
            placeholder="例如：Start project atlas and hire worker planner."
            rows={3}
            disabled={busy}
          />
          </Field>
          <div className="conversation-composer-actions">
            <Button variant="primary" type="submit"
              disabled={busy || intentText.trim().length === 0}>
              {busy ? '提交中…' : '发送'}
            </Button>
            <p className="task-note">发送后只显示本地 pending 状态；用户消息、Boss 回执与员工进展均以 Runtime 发布事实为准。</p>
          </div>
        </form>
      </>}
    </section>
  );
}
