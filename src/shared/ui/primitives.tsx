import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
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

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cx('ui-button', `ui-button-${variant}`, `ui-button-${size}`, className)}
      {...rest}
    />
  );
}

export function IconButton({
  label,
  className,
  type = 'button',
  ...rest
}: { readonly label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx('ui-icon-button', className)}
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

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx('ui-control', 'ui-textarea', className)} {...rest} />;
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
