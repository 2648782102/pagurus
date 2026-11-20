import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './errors.js';
import type { AsyncPhase } from './async-state.js';

/**
 * One read, and the four states it can be in.
 *
 * Thirteen panels wrote this out by hand — set `loading`, await, guard on
 * abort, set `ready` or `error` — and each spelled its own phase union beside
 * it. The repeated part is small but it is where aborts get forgotten: a
 * request that resolves after the panel unmounts, or after a newer request
 * started, writes state for a read nobody is waiting for.
 *
 * The precondition is the part that stopped a shared hook before. Several
 * panels can be unready before the read even applies — no Runtime yet, or a
 * Runtime that does not offer this route — and those are not errors and not
 * loading. `ready()` returns the phase to sit in instead of reading, or `null`
 * to go ahead, so a caller keeps that distinction without a bespoke state
 * machine.
 */
export interface AsyncResourceOptions<T> {
  /** Read the data. Receives the abort signal; should pass it to the client. */
  readonly read: (signal: AbortSignal) => Promise<T>;
  /** Copy for a failed read, or a function of the failure. */
  readonly failure: string | ((cause: unknown) => string);
  /**
   * Consulted before every read. Returning a phase means "do not read, sit in
   * this state" — `checking` before a Runtime is known, `unsupported` when it
   * lacks the route. Returning `null` proceeds.
   *
   * Whatever this reads has to appear in `deps`. The gate is consulted when the
   * effect runs, and nothing else makes the effect run again: a gate that
   * depends on `runtime` needs `runtime` in `deps`, or the panel sits in
   * `checking` forever after the Runtime arrives.
   */
  readonly precondition?: () => AsyncPhase | null;
  /** Re-read when these change. Identity is compared, so memoise arrays. */
  readonly deps?: readonly unknown[];
}

export interface AsyncResource<T> {
  readonly phase: AsyncPhase;
  readonly data: T | null;
  readonly error: string | null;
  /** Re-run the read. Does not change `phase` until the precondition passes. */
  readonly reload: () => void;
  /** Apply a change the caller made locally, without a round trip. */
  readonly setData: (next: T) => void;
}

export function useAsyncResource<T>(options: AsyncResourceOptions<T>): AsyncResource<T> {
  const { read, failure, precondition, deps = [] } = options;
  const [phase, setPhase] = useState<AsyncPhase>('loading');
  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);

  /*
   * Held in a ref so the effect does not re-run when a caller passes a new
   * closure. The deps array is the only thing that should trigger a read; a
   * function identity changing every render would otherwise refetch forever.
   */
  const latest = useRef({ read, failure, precondition });
  latest.current = { read, failure, precondition };

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const { read: run, failure: fail, precondition: gate } = latest.current;

    const blocked = gate?.() ?? null;
    if (blocked !== null) {
      /* Not an error and not loading: the read does not apply yet. */
      setPhase(blocked);
      setError(null);
      return () => { cancelled = true; controller.abort(); };
    }

    /*
     * A reload after the first success keeps `ready`. Panels render their rows
     * only in `ready`, so dropping to `loading` for a refresh blanks the table
     * and then brings it back — and clears any form the reader was filling in.
     * The data is still the last good read, so `ready` is the honest phase.
     */
    setPhase((current) => (current === 'ready' ? 'ready' : 'loading'));
    setError(null);
    void (async () => {
      try {
        const result = await run(controller.signal);
        /* An abort that lands after the await must not publish anything. */
        if (cancelled || controller.signal.aborted) return;
        setDataState(result);
        setPhase('ready');
      } catch (cause) {
        if (cancelled || controller.signal.aborted) return;
        /*
         * A string is the fallback sentence, not a replacement for the cause:
         * the thrown message is usually the more specific one ("Runtime upstream
         * unavailable"), and dropping it would turn every distinct outage into
         * the same generic line.
         */
        setError(typeof fail === 'string' ? errorMessage(cause, fail) : fail(cause));
        setPhase('error');
      }
    })();

    return () => { cancelled = true; controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is the caller's list
  }, [generation, ...deps]);

  const reload = useCallback(() => setGeneration((value) => value + 1), []);
  const setData = useCallback((next: T) => setDataState(next), []);

  return { phase, data, error, reload, setData };
}

/** The default failure copy, for callers that only need one line. */
export function describeFailure(cause: unknown, fallback: string): string {
  return errorMessage(cause, fallback);
}
