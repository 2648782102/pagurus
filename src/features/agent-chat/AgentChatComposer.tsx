import { useEffect, useRef, useState } from 'react';
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
  const characters = draft.length;
  const [pasteNotice, setPasteNotice] = useState(false);

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
          onPaste={(event) => {
            /*
             * A pasted transcript can be thousands of lines. The composer
             * stops growing at 40% of the viewport, so the box itself is safe,
             * but the reader should know why it stopped rather than assume the
             * paste was truncated.
             */
            const pasted = event.clipboardData?.getData('text') ?? '';
            if (pasted.length > VERY_LONG_DRAFT && !pasted.includes('\u0000')) {
              setPasteNotice(true);
              window.setTimeout(() => setPasteNotice(false), 6000);
            }
          }}
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
          /*
           * Not disabled while busy: the request is already sent, and locking
           * the box forces the reader to wait before starting the next
           * thought. The danger the flag prevented — a second submit — is
           * handled by `submit()` refusing while busy.
           */
          placeholder={busy ? '正在发送上一句…' : '说点什么…'}
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
      <div className="agent-chat-composer-foot">
        <p className="agent-chat-composer-hint" role="status">
          {busy
            ? '正在发送…'
            : waiting
              ? '正在等待回复；你可以继续写下一条'
              : 'Enter 发送，Shift + Enter 换行'}
        </p>
        {/*
         * Length only appears once it is worth knowing: a count from the first
         * character is noise on a one-sentence question, and a warning that
         * arrives only when it matters is a warning people read.
         */}
        {characters > LONG_DRAFT && (
          <p className={`agent-chat-composer-count${characters > VERY_LONG_DRAFT ? ' is-over' : ''}`}>
            {characters.toLocaleString()} 字
          </p>
        )}
      </div>
      {pasteNotice && (
        <p className="agent-chat-composer-notice" role="status">
          已粘贴一大段内容，输入框会在约 40% 屏高处停止增高；继续添加请向上滚动。
        </p>
      )}
    </form>
  );
}

/** A draft long enough that its length is worth showing. */
const LONG_DRAFT = 600;
/** Past this, the draft is likely to be cut or cost more than the reader expects. */
const VERY_LONG_DRAFT = 4000;
