import { useEffect, useRef } from 'react';

export interface TriggerMenuItem {
  readonly id: string;
  readonly title: string;
  readonly hint?: string;
  /** Right-aligned secondary text: a shortcut, a size, a directory. */
  readonly meta?: string;
}

/**
 * The popup above the composer for `/` and `@`.
 *
 * It is a listbox, not a menu of buttons: the reader is choosing one item from
 * a filtered set with the keyboard, and arrow keys plus Enter are the whole
 * interaction. Focus stays in the textarea — moving it into the popup would
 * lose the caret and the draft with it — so the active row is reported through
 * `aria-activedescendant` instead.
 */
export function ComposerTriggerMenu({
  label,
  emptyLabel,
  items,
  activeIndex,
  onChoose,
  onHover,
  loading = false,
}: {
  readonly label: string;
  readonly emptyLabel: string;
  readonly items: readonly TriggerMenuItem[];
  readonly activeIndex: number;
  readonly onChoose: (item: TriggerMenuItem) => void;
  readonly onHover: (index: number) => void;
  readonly loading?: boolean;
}) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const activeId = items[activeIndex] ? optionId(items[activeIndex]!.id) : undefined;

  useEffect(() => {
    if (activeId === undefined) return;
    const node = document.getElementById(activeId);
    // jsdom has no layout, so `scrollIntoView` is absent there; the list is
    // short enough that a missing scroll is not a functional loss.
    node?.scrollIntoView?.({ block: 'nearest' });
  }, [activeId]);

  return (
    <div className="agent-trigger-pop" role="presentation">
      <p className="agent-trigger-pop-label" id="agent-trigger-label">{label}</p>
      {items.length === 0 ? (
        <p className="agent-trigger-empty">{loading ? '正在读取工作区…' : emptyLabel}</p>
      ) : (
        <ul
          className="agent-trigger-list"
          role="listbox"
          aria-labelledby="agent-trigger-label"
          aria-activedescendant={activeId}
          ref={listRef}
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              id={optionId(item.id)}
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'is-active' : ''}
              onMouseEnter={() => onHover(index)}
              /*
               * `onMouseDown`, not `onClick`: the textarea's blur fires before
               * a click lands, and choosing from a list that just vanished is
               * the classic version of this bug.
               */
              onMouseDown={(event) => {
                event.preventDefault();
                onChoose(item);
              }}
            >
              <span className="agent-trigger-item-main">
                <span className="agent-trigger-item-title">{item.title}</span>
                {item.hint && <span className="agent-trigger-item-hint">{item.hint}</span>}
              </span>
              {item.meta && <span className="agent-trigger-item-meta">{item.meta}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function optionId(id: string): string {
  return `agent-trigger-option-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}
