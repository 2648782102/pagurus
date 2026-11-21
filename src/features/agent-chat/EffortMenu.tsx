import { useEffect, useId, useRef, useState } from 'react';
import { effortHint, effortLabel, effortMeter } from '../../shared/ui/effort-label.js';

/**
 * The reasoning-strength picker in the composer's toolbar.
 *
 * Replaces a native `<select>` stretched invisibly over the chip. That control
 * was honest about state but wrong about the surface: on macOS it opened a
 * system menu — grey, 13px, square corners, its own highlight colour — bolted
 * under a 22px chip in a reading app. The list here is drawn from the same
 * tokens as the rest of the product, so it belongs to the page it opens in.
 *
 * What the native control gave for free and this has to earn back:
 *
 *   keyboard   Arrow keys move the highlight, Enter commits, Escape closes and
 *              returns focus to the trigger, Home/End jump to the ends.
 *   IME        Enter is ignored while a composition is active, the same rule
 *              the composer applies to sending.
 *   focus      The menu takes focus on open, so a keyboard user is already in
 *              it; closing puts focus back on the chip that opened it.
 *   dismiss    A click outside, a scroll, or Escape closes without changing
 *              anything.
 *   announce   `role="listbox"` with `aria-activedescendant`, so a screen
 *              reader reads the highlighted row rather than the whole list.
 *
 * The levels are whatever the model publishes, in the gateway's order. Nothing
 * here knows the names of the steps: a model offering `[none, low, high, max]`
 * gets four rows and a model offering `[high]` never opens at all.
 */
export function EffortMenu({
  effort,
  levels,
  onChange,
}: {
  /** The level the next message will use. */
  readonly effort: string;
  /** The levels this conversation's model publishes, weakest first. */
  readonly levels: readonly string[];
  readonly onChange: (effort: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, levels.indexOf(effort)));
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  /*
   * Closing always puts focus back on the trigger. Every close path — Escape,
   * choosing a row, clicking away — goes through here, so a keyboard user
   * never loses their place in the toolbar.
   */
  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    // Open with the current choice highlighted, not the first step: a reader
    // who opens the menu is usually deciding between this and its neighbour.
    setActiveIndex(Math.max(0, levels.indexOf(effort)));
    menuRef.current?.focus();
  }, [open, effort, levels]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    };
    /*
     * A page scroll moves the card out from under the menu, so the menu closes.
     * A scroll *inside* the list — which the same capturing listener sees, with
     * the list as the target — must not: a model with six or eight levels makes
     * the list scrollable, and closing on that would make the menu unusable at
     * exactly the moment it has the most to say.
     */
    const onScroll = (event: Event) => {
      const scrolled = event.target;
      if (scrolled instanceof Node && (menuRef.current?.contains(scrolled)
        || triggerRef.current?.contains(scrolled))) return;
      close(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const choose = (level: string) => {
    onChange(level);
    close(true);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // A Chinese or Japanese IME fires Enter to commit a candidate; sending it
    // would pick whichever row happened to be highlighted.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % levels.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + levels.length) % levels.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(levels.length - 1);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const level = levels[activeIndex];
        if (level !== undefined) choose(level);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="effort-menu">
      <button
        ref={triggerRef}
        type="button"
        className="agent-composer-chip effort-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        /*
         * Named explicitly rather than from its text. The visible word is the
         * level ("快速", "最强"), so without this a screen reader would announce
         * the chip as a button called "最强" and the reader would have to guess
         * what it controls. The name states the question; the text stays the
         * answer.
         */
        aria-label={`思考强度：${effortLabel(effort)}`}
        onClick={() => setOpen((value) => !value)}
        title="思考强度：下一条消息使用"
      >
        <span className="agent-composer-chip-text">{effortLabel(effort)}</span>
        <span className="effort-caret" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={listId}
          className="effort-list anim-pop"
          role="listbox"
          tabIndex={-1}
          aria-label="思考强度"
          aria-activedescendant={`${listId}-${activeIndex}`}
          onKeyDown={onKeyDown}
        >
          {levels.map((level, index) => {
            const selected = level === effort;
            const hint = effortHint(level);
            return (
              <div
                key={level}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                className={`effort-option${index === activeIndex ? ' is-active' : ''}${selected ? ' is-selected' : ''}`}
                // `onMouseDown` rather than `onClick`: the document-level
                // dismiss handler fires before a click lands, and would close
                // the menu out from under the pointer.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(level);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="effort-option-meter" aria-hidden="true">
                  {Array.from({ length: levels.length }, (_, step) => (
                    <span key={step} className={step < effortMeter(level, levels) ? 'is-on' : undefined} />
                  ))}
                </span>
                <span className="effort-option-copy">
                  <span className="effort-option-label">{effortLabel(level)}</span>
                  {hint !== null && <span className="effort-option-hint">{hint}</span>}
                </span>
                {selected && <span className="effort-option-check" aria-hidden="true">✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
