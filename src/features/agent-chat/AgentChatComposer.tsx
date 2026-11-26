import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Textarea } from '../../shared/ui/primitives.js';
import { AgentIcon } from '../../shared/ui/AgentIcon.js';
import { ComposerTriggerMenu, type TriggerMenuItem } from './ComposerTriggerMenu.js';
import {
  applyTriggerChoice,
  composerTriggerAt,
  fileMention,
  filterCommands,
  type ComposerCommand,
} from './composer-trigger.js';
import { useWorkspaceFiles } from './useWorkspaceFiles.js';

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
  /**
   * The mode controls for this message — model, effort, and whatever else
   * applies — rendered on the toolbar's left.
   *
   * The composer owns the row's geometry, not its contents: which controls a
   * surface offers is a question about the product, and the console and the
   * shipped app answer it differently.
   */
  readonly children?: ReactNode;
  /**
   * Commands offered by `/`. Omitted or empty means the trigger is not
   * advertised: a menu that opens onto nothing is worse than no menu.
   */
  readonly commands?: readonly ComposerCommand[];
  readonly onCommand?: (commandId: string) => void;
  /**
   * Whether the Runtime publishes a workspace index. When it does not, `@`
   * stays plain text rather than opening a picker that cannot list anything.
   */
  readonly filesEnabled?: boolean;
}

export function AgentChatComposer({
  draft, busy, waiting, onDraftChange, onSend, autoFocus = false, children,
  commands = [], onCommand, filesEnabled = false,
}: AgentChatComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const characters = draft.length;
  const [pasteNotice, setPasteNotice] = useState(false);
  const [caret, setCaret] = useState(draft.length);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const trigger = useMemo(() => {
    const found = composerTriggerAt(draft, caret, {
      commands: commands.length > 0,
      files: filesEnabled,
    });
    if (found === null) return null;
    // Escape closes the menu for this exact trigger position only; typing
    // another character reopens it, because that is a new question.
    if (dismissedAt !== null && dismissedAt === found.start) return null;
    return found;
  }, [commands.length, filesEnabled, draft, caret, dismissedAt]);

  const workspaceFiles = useWorkspaceFiles(
    trigger?.kind === 'file' ? trigger.query : null,
    filesEnabled,
  );

  const menuItems: readonly TriggerMenuItem[] = useMemo(() => {
    if (trigger === null) return [];
    if (trigger.kind === 'command') {
      return filterCommands(commands, trigger.query).map((command) => ({
        id: command.id,
        title: command.title,
        hint: command.hint,
        meta: `/${command.id}`,
      }));
    }
    return workspaceFiles.files.map((file) => ({
      id: file.path,
      title: file.path.split('/').pop() ?? file.path,
      hint: file.directory.length > 0 ? file.directory : '工作区根目录',
      meta: formatBytes(file.bytes),
    }));
  }, [commands, workspaceFiles.files, trigger]);

  useEffect(() => {
    setActiveIndex(0);
  }, [trigger?.kind, trigger?.query]);

  const choose = (item: TriggerMenuItem) => {
    if (trigger === null) return;
    if (trigger.kind === 'command') {
      onDraftChange(applyTriggerChoice(draft, trigger, '').draft);
      onCommand?.(item.id);
      return;
    }
    /*
     * DSH's mention grammar decides the inserted text: a path with a space
     * becomes `@"a path"`, and the trailing space closes the token so the next
     * word is prose again.
     */
    const applied = applyTriggerChoice(draft, trigger, `${fileMention(item.id)} `, {
      quoted: trigger.quoted,
    });
    onDraftChange(applied.draft);
    setCaret(applied.caret);
    setDismissedAt(null);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(applied.caret, applied.caret);
    });
  };

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  /*
   * A draft that changed without a keystroke — an example prompt picked on the
   * landing screen, a restored draft after switching threads — has no caret to
   * report, because the textarea never received one. Treating its end as the
   * caret is the same thing a reader would get by clicking into the box, and
   * it keeps `/` at the end of a restored draft working.
   */
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setCaret(draft.length);
  }, [draft]);

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

  /*
   * What the toolbar's right end says, if anything.
   *
   * A pending send outranks the length: the reader just pressed Enter and is
   * waiting to hear that it landed, which is a fact about the request rather
   * than about the box. The length is the quiet default once the draft has
   * grown long enough for it to be useful, and the keyboard hint is the resting
   * state — the one line a reader needs the first time and never again.
   */
  const status = busy ? '正在发送…' : waiting ? '正在等待回复' : null;

  return (
    <form className="agent-chat-composer" onSubmit={(event) => {
      event.preventDefault();
      submit();
    }}>
      <label className="sr-only" htmlFor="agent-chat-message">输入消息</label>
      <div className="agent-chat-composer-card">
        {/*
         * Above the draft, inside the card: it explains something that already
         * happened to the box, so it belongs where the reader is looking when
         * it appears rather than underneath it.
         */}
        {pasteNotice && (
          <p className="agent-chat-composer-notice" role="status">
            已粘贴一大段内容，输入框会在约 40% 屏高处停止增高；继续添加请向上滚动。
          </p>
        )}
        <Textarea
          id="agent-chat-message"
          textareaRef={inputRef}
          value={draft}
          rows={1}
          aria-expanded={trigger !== null}
          aria-controls={trigger !== null ? 'agent-trigger-popup' : undefined}
          onChange={(event) => {
            onDraftChange(event.target.value);
            /*
             * The caret is read after React has applied the value, so a
             * deletion right after the trigger closes the menu in the same
             * keystroke instead of one frame later.
             */
            const node = event.currentTarget;
            const next = node.value;
            const position = node.selectionStart ?? next.length;
            window.requestAnimationFrame(() => {
              setCaret(position);
              setDismissedAt(null);
            });
          }}
          onSelect={(event) => setCaret(event.currentTarget.selectionStart ?? 0)}
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
            /*
             * The popup owns the arrows and Enter while it is open. Otherwise
             * Enter would send a half-typed `/command` and the reader would
             * learn about the menu only after their message went out.
             */
            if (trigger !== null) {
              if (event.key === 'Escape') {
                event.preventDefault();
                setDismissedAt(trigger.start);
                return;
              }
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                if (menuItems.length === 0) return;
                event.preventDefault();
                setActiveIndex((index) => {
                  const delta = event.key === 'ArrowDown' ? 1 : -1;
                  return (index + delta + menuItems.length) % menuItems.length;
                });
                return;
              }
              if (event.key === 'Enter' || event.key === 'Tab') {
                const item = menuItems[activeIndex];
                if (item === undefined) return;
                event.preventDefault();
                choose(item);
                return;
              }
            }
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
        {trigger !== null && (
          <div id="agent-trigger-popup">
            <ComposerTriggerMenu
              label={trigger.kind === 'command' ? '命令' : '引用工作区文件'}
              emptyLabel={trigger.kind === 'command' ? '没有匹配的命令。' : '没有匹配的文件。'}
              items={menuItems}
              activeIndex={activeIndex}
              loading={trigger.kind === 'file' && workspaceFiles.loading}
              onChoose={choose}
              onHover={setActiveIndex}
            />
          </div>
        )}
        {/*
         * A toolbar row under the text, the way an agent client is laid out:
         * the mode controls sit on the left where a reader looks for "what
         * applies to this message"; the readings and the send button sit on the
         * right where the action ends.
         */}
        <div className="agent-chat-composer-row">
          <div className="agent-chat-composer-tools">
            {children}
          </div>
          {/*
           * One slot, one line: the hint, the pending state, or the length.
           * They never appear together, because they answer the same question
           * and the row would grow to hold three answers nobody reads at once.
           */}
          <div className="agent-chat-composer-meta">
            {status !== null ? (
              <p className="agent-chat-composer-hint" role="status">{status}</p>
            ) : characters > LONG_DRAFT ? (
              /*
               * Length only appears once it is worth knowing: a count from the
               * first character is noise on a one-sentence question, and a
               * warning that arrives only when it matters is a warning people
               * read.
               */
              <p className={`agent-chat-composer-count${characters > VERY_LONG_DRAFT ? ' is-over' : ''}`}>
                {characters.toLocaleString()} 字
              </p>
            ) : (
              <p className="agent-chat-composer-hint agent-chat-composer-keys">Enter 发送，Shift + Enter 换行</p>
            )}
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
              <AgentIcon name={busy ? 'stop' : 'send'} size={15} />
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

/** A draft long enough that its length is worth showing. */
const LONG_DRAFT = 600;
/** Past this, the draft is likely to be cut or cost more than the reader expects. */
const VERY_LONG_DRAFT = 4000;

/** A size a reader can judge: bytes are a fact, "2.1 KB" is a decision. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
