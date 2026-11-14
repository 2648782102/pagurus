import type { KeyboardEvent } from 'react';

interface AgentChatComposerProps {
  readonly draft: string;
  readonly busy: boolean;
  readonly waiting: boolean;
  readonly onDraftChange: (value: string) => void;
  readonly onSend: () => void;
}

export function AgentChatComposer({ draft, busy, waiting, onDraftChange, onSend }: AgentChatComposerProps) {
  const submit = () => {
    if (draft.trim().length === 0 || busy) return;
    onSend();
  };

  return (
    <form className="agent-chat-composer" onSubmit={(event) => {
      event.preventDefault();
      submit();
    }}>
      <label className="sr-only" htmlFor="agent-chat-message">输入消息</label>
      <div className="agent-chat-composer-field">
        <textarea
          id="agent-chat-message"
          value={draft}
          rows={2}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="输入消息，Enter 发送，Shift + Enter 换行"
          disabled={busy}
        />
        <button className="button-primary agent-chat-send" type="submit"
          disabled={busy || draft.trim().length === 0} aria-label="发送消息">
          ↑
        </button>
      </div>
      <p className="agent-chat-composer-hint" role="status">
        {busy ? '正在提交…' : waiting ? '正在等待回复…' : 'Runtime 发布事实后消息才会显示'}
      </p>
    </form>
  );
}
