import type { KeyboardEvent } from 'react';
import { Button, Textarea } from '../../shared/ui/primitives.js';

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
        <Textarea
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
          placeholder="说点什么…"
          disabled={busy}
        />
        <Button
          className="agent-chat-send"
          type="submit"
          variant="primary"
          disabled={busy || draft.trim().length === 0}
          aria-label="发送消息"
        >
          ↑
        </Button>
      </div>
      <p className="agent-chat-composer-hint" role="status">
        {busy
          ? '正在发送…'
          : waiting
            ? '正在等待回复…'
            : 'Enter 发送，Shift + Enter 换行'}
      </p>
    </form>
  );
}
