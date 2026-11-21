import { useEffect, useId, useRef, useState } from 'react';
import type { AgentChatModel } from '../../shared/api/agent-chat.js';

/**
 * The model the next message will run on, and a way to change it.
 *
 * It used to be a static chip: the model was fixed at conversation creation and
 * the only way to change it was to start a new conversation, which threw the
 * transcript away to change one field. Switching now happens inside the
 * conversation, so this is a control like the effort chip beside it.
 *
 * Deliberately quieter than the effort menu: a model is changed rarely and
 * usually for a reason (cost, quota, a task another model is better at), while
 * the level changes with the question. The list shows name and provider so two
 * entries with the same name from different gateways can be told apart.
 */
export function ModelChip({
  reference,
  models,
  onSelect,
}: {
  /** `magpie:deepseek-flash` — what the conversation currently runs on. */
  readonly reference: string;
  readonly models: readonly AgentChatModel[];
  readonly onSelect: (model: AgentChatModel) => void;
}) {
  const [open, setOpen] = useState(false);
  /**
   * The row the pointer is over.
   *
   * State, not a class toggled from a DOM event: the row a click commits has to
   * match the row that looks active, and the two stay in step only if React
   * owns both. The effort menu keeps its highlight in state for the same reason.
   */
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const current = models.find((model) => model.reference === reference);
  const label = current?.displayName ?? shortModel(reference);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  /*
   * Opening: highlight the current choice, move focus in, scroll it into view.
   *
   * One effect, one dependency array. Splitting this into two with different
   * arrays made React reject the hook ("the final argument passed to useEffect
   * changed size between renders") and the menu stopped opening at all — a
   * reminder that a hook's dependency list is part of its identity, not a
   * comment on what it reads.
   *
   * `scrollIntoView` is called optionally: it is absent in jsdom and in some
   * embedded webviews, and a missing scroll is cosmetic while a throw here
   * would take the menu down.
   */
  useEffect(() => {
    if (!open) return;
    setActiveIndex(Math.max(0, models.findIndex((model) => model.reference === reference)));
    const menu = menuRef.current;
    menu?.focus({ preventScroll: true });
    menu?.querySelector('.model-option.is-selected')?.scrollIntoView?.({ block: 'nearest' });
  }, [open, models, reference]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    };
    /*
     * The page moving closes the menu; the list scrolling must not.
     *
     * A scroll event carries no target of its own on `window`, but a capturing
     * listener on `window` sees the target of the element that scrolled — and a
     * catalogue long enough to scroll fires this from inside the list. Ignoring
     * those is what stopped the menu closing itself: opening scrolls the
     * current choice into view, that scroll reached this handler, and the menu
     * vanished the instant it appeared.
     */
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      if (target instanceof Node && triggerRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    /*
     * Same keys as the effort menu, so the two chips in the toolbar behave the
     * same way: arrows move the highlight, Enter commits, Escape leaves.
     */
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % models.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + models.length) % models.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(models.length - 1);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const chosen = models[activeIndex];
        if (chosen !== undefined) {
          onSelect(chosen);
          close(true);
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="model-chip">
      <button
        ref={triggerRef}
        type="button"
        className="agent-composer-chip model-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`模型：${label}`}
        title="切换模型：从下一条消息开始生效"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="agent-composer-chip-text">{label}</span>
        <span className="effort-caret" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={listId}
          className="model-list anim-pop"
          role="listbox"
          tabIndex={-1}
          aria-label="模型"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          onKeyDown={onKeyDown}
        >
          {models.map((model, index) => {
            const selected = model.reference === reference;
            /*
             * The provider line is only worth a row when it tells the two apart.
             *
             * Every model in a single-gateway setup shares one provider name, so
             * printing it under each of twenty entries was twenty copies of the
             * same word — noise that made the list harder to scan, not easier.
             */
            const sharedProvider = models.every((entry) => entry.providerId === model.providerId);
            return (
              <div
                key={model.reference}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                className={`model-option${selected ? ' is-selected' : ''}${index === activeIndex ? ' is-active' : ''}`}
                /* `onMouseDown`, not `onClick`: the document-level dismiss
                   handler runs before a click and would close the list first. */
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(model);
                  close(true);
                }}
                /* Matches the effort menu: the row under the pointer is the one
                   a click commits, so it reads as active. */
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                <span className="model-option-copy">
                  <span className="model-option-name">{model.displayName}</span>
                  {!sharedProvider && (
                    <span className="model-option-provider">{model.providerId}</span>
                  )}
                </span>
                {selected && <span className="model-option-check" aria-hidden="true">✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function shortModel(reference: string): string {
  const separator = reference.indexOf(':');
  return separator >= 0 ? reference.slice(separator + 1) : reference;
}
