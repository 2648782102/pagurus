/**
 * The one way a panel turns "no rows yet" into visible copy.
 *
 * An empty list has two meanings that must never be rendered the same way:
 * the read has not completed (`loading`), or it completed and found nothing
 * (`ready-empty`). Collapsing them makes the UI assert "Runtime published
 * nothing" while it actually knows nothing yet.
 *
 * See the shared async-state styles.
 */
export type AsyncPhase =
  | 'checking'
  | 'loading'
  | 'ready'
  | 'partial'
  | 'error'
  | 'unsupported'
  | 'disconnected';

export interface EmptyCopyOptions {
  readonly phase: AsyncPhase;
  /** Shown only once the read completed and genuinely found nothing. */
  readonly empty: string;
  /** Shown while the first read is in flight. Defaults to a generic line. */
  readonly loading?: string;
}

/** Returns the copy for an empty collection, or null when rows should render. */
export function emptyCollectionCopy({ phase, empty, loading }: EmptyCopyOptions): string | null {
  if (phase === 'loading' || phase === 'checking') return loading ?? '正在读取…';
  if (phase === 'ready' || phase === 'partial') return empty;
  return null;
}

/** Counts are "—" until a read lands, never a misleading 0. */
export function asyncCount(phase: AsyncPhase, value: number): number | '—' {
  return phase === 'loading' || phase === 'checking' ? '—' : value;
}

export function isLoading(phase: AsyncPhase): boolean {
  return phase === 'loading' || phase === 'checking';
}
