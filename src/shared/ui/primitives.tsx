import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

/**
 * Small, dependency-free UI primitives for the console.
 *
 * They exist so feature panels stop re-inventing button, field, tag, and section
 * styling. Styling lives in styles.css under the `ui-` prefix; this module owns
 * markup and the small amount of accessibility wiring that must stay identical
 * everywhere. No Runtime data or authority is represented here.
 */

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const cx = (...names: (string | false | undefined | null)[]) => names.filter(Boolean).join(' ');

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';
/** `pill` is the Agent chrome shape; `square` is the instrument default. */
export type ButtonShape = 'square' | 'pill';

export function Button({
  variant = 'secondary',
  size = 'md',
  shape = 'square',
  pressed,
  buttonRef,
  className,
  type = 'button',
  ...rest
}: {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly shape?: ButtonShape;
  readonly pressed?: boolean;
  /** Explicit ref; avoids turning every caller into a forwardRef consumer. */
  readonly buttonRef?: Ref<HTMLButtonElement>;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      ref={buttonRef}
      className={cx('ui-button', `ui-button-${variant}`, `ui-button-${size}`,
        shape === 'pill' && 'ui-button-pill', pressed && 'is-on', className)}
      {...rest}
    />
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly htmlFor?: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cx('ui-field', className)}>
      <label className="ui-field-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint !== undefined && <small className="ui-field-hint">{hint}</small>}
    </div>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('ui-control', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx('ui-control', 'ui-select', className)} {...rest}>{children}</select>;
}

export function Textarea({
  className,
  textareaRef,
  ...rest
}: {
  /** Explicit ref; keeps callers from needing forwardRef. */
  readonly textareaRef?: Ref<HTMLTextAreaElement>;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea ref={textareaRef} className={cx('ui-control', 'ui-textarea', className)} {...rest} />;
}

export function Tag({ tone = 'neutral', children }: { readonly tone?: Tone; readonly children: ReactNode }) {
  return <span className="ui-tag" data-tone={tone}>{children}</span>;
}

export function StatusDot({ tone = 'neutral', label }: { readonly tone?: Tone; readonly label?: string }) {
  return (
    <span className="ui-status-dot" data-tone={tone} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <span />
    </span>
  );
}

export function Section({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  readonly id?: string;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string;
}) {
  return (
    <section className={cx('ui-section', className)}>
      <header className="ui-section-head">
        <div className="ui-section-heading">
          <h2 className="ui-section-title" id={id}>{title}</h2>
          {description !== undefined && <p className="ui-section-description">{description}</p>}
        </div>
        {action !== undefined && <div className="ui-section-action">{action}</div>}
      </header>
      {children}
    </section>
  );
}

export interface FactEntry {
  readonly label: ReactNode;
  readonly value: ReactNode;
  /** Renders the value in the monospaced voice — ids, paths, digests. */
  readonly code?: boolean;
  /** Full value for a truncated display, shown on hover. */
  readonly title?: string;
}

/**
 * A labelled list of facts: database path, model, revision ids.
 *
 * Nine panels wrote this markup out by hand — a `<dl>`, a `<div>` per row, a
 * `<dt>` and a `<dd>` — which is where the row markup drifted (some wrap the
 * value in `<code>`, some do not; some pass a title attribute, some do not).
 * The list is the same idea every time, so it is one component.
 *
 * Only the structure is shared. The panels lay these out differently — a
 * two-column grid with cell borders, a label/value row, a stacked block — and
 * those are real differences, not drift. Passing `className` keeps each
 * panel's own layout; the base rule below only resets the browser's `<dl>`
 * margins and row margins, which is the part every one of them had to repeat.
 */
export function FactList({
  facts,
  className,
  id,
  label,
}: {
  readonly facts: readonly FactEntry[];
  readonly className?: string;
  readonly id?: string;
  /** An accessible name, when the list is not introduced by a heading. */
  readonly label?: string;
}) {
  return (
    <dl className={cx('ui-facts', className)} id={id} aria-label={label}>
      {facts.map((fact, index) => (
        <div key={index}>
          <dt>{fact.label}</dt>
          <dd>
            {fact.code
              ? <code title={fact.title}>{fact.value}</code>
              : fact.title !== undefined
                ? <span title={fact.title}>{fact.value}</span>
                : fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Disclosure({
  summary,
  children,
  className,
  ...rest
}: {
  readonly summary: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
} & Omit<HTMLAttributes<HTMLDetailsElement>, 'children'>) {
  return (
    <details className={cx('ui-disclosure', className)} {...rest}>
      <summary className="ui-disclosure-summary">{summary}</summary>
      <div className="ui-disclosure-body">{children}</div>
    </details>
  );
}

/**
 * Placeholder rows for a read that has not landed.
 *
 * A panel that renders nothing and then fills in reads as a flicker; one that
 * renders rows the size of its content reads as arriving. The count is a hint,
 * not a promise — the real list replaces it wholesale.
 *
 * It is `aria-hidden` and carries its own screen-reader label: a reader should
 * hear "loading", not the shape of an empty box.
 */
export function SkeletonRows({
  rows = 3,
  label = '正在读取',
}: {
  readonly rows?: number;
  readonly label?: string;
}) {
  return (
    <div className="ui-skeleton">
      <span className="sr-only" role="status">{label}</span>
      <div aria-hidden="true" className="ui-skeleton-rows">
        {Array.from({ length: rows }, (_, index) => (
          <span className="ui-skeleton-row" key={index} />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  tone = 'neutral',
}: {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  readonly tone?: 'neutral' | 'compact';
}) {
  return (
    <div className="ui-empty" data-tone={tone} role="status">
      <div className="ui-empty-copy">
        <p className="ui-empty-title">{title}</p>
        {description !== undefined && <p className="ui-empty-description">{description}</p>}
      </div>
      {action !== undefined && <div className="ui-empty-action">{action}</div>}
    </div>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
  action,
  role,
}: {
  readonly tone?: Exclude<Tone, 'success'>;
  readonly title?: ReactNode;
  readonly children: ReactNode;
  readonly action?: ReactNode;
  readonly role?: 'status' | 'alert' | 'note';
}) {
  return (
    <div
      className="ui-notice"
      data-tone={tone}
      role={role ?? (tone === 'danger' ? 'alert' : 'status')}
    >
      <div className="ui-notice-copy">
        {title !== undefined && <strong className="ui-notice-title">{title}</strong>}
        <div className="ui-notice-body">{children}</div>
      </div>
      {action !== undefined && <div className="ui-notice-action">{action}</div>}
    </div>
  );
}
