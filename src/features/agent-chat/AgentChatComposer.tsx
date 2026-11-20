import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Textarea } from '../../shared/ui/primitives.js';

interface AgentChatComposerProps {
  readonly draft: string;
  readonly busy: boolean;
  readonly waiting: boolean;
  readonly onDraftChange: (value: string) => void;
  readonly onSend: () => void;
  /**
   * Focus the input on mount. Set only for a fresh conversation: a resumed
   * thread is being read, and stealing focus there jumps the reader's place.
   */
  readonly autoFocus?: boolean;
}

export function AgentChatComposer({
  draft, busy, waiting, onDraftChange, onSend, autoFocus = false,
}: AgentChatComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  /*
   * Grow with the draft, up to a cap.
   *
   * A fixed two-row box means a long message, a pasted log, or a multi-step
   * question is read through a letterbox. Growing with the content keeps the
   * whole draft visible; the cap stops the composer from eating the thread.
   */
  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = 'auto';
    const max = Math.round(window.innerHeight * 0.4);
    node.style.height = `${Math.min(node.scrollHeight, max)}px`;
    node.style.overflowY = node.scrollHeight > max ? 'auto' : 'hidden';
  }, [draft]);

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
          textareaRef={inputRef}
          value={draft}
          rows={1}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
            // A Chinese or Japanese IME fires Enter to commit a candidate.
            // Sending then would truncate the sentence the person is still
            // composing, so Enter only sends once composition has ended.
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
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
          /*
           * Not `disabled`: a disabled button leaves the tab order, so a
           * keyboard user typing a message could not reach Send without
           * shift-tabbing backwards. It stays focusable and refuses the click
           * instead, which is what "not ready yet" should mean.
           */
          aria-disabled={busy || draft.trim().length === 0}
          aria-label="发送消息"
          onClick={(event) => {
            if (busy || draft.trim().length === 0) event.preventDefault();
          }}
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
