import { useEffect, useRef } from 'react';

/**
 * Run a callback on an interval without leaking in-flight work.
 *
 * A tick is skipped while the previous request is still running, so a slow
 * request is allowed to settle instead of being aborted by the next interval.
 * The last request is aborted only when polling is disabled or the component
 * unmounts, and hidden tabs skip the tick entirely.
 */
export function useVisiblePolling(
  callback: (signal: AbortSignal) => void | Promise<void>,
  intervalMs: number,
  enabled = true,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    let inFlight: AbortController | null = null;
    const tick = () => {
      if (document.visibilityState !== 'visible' || inFlight !== null) return;
      const controller = new AbortController();
      inFlight = controller;
      void Promise.resolve(callbackRef.current(controller.signal)).finally(() => {
        if (inFlight === controller) inFlight = null;
      });
    };
    const timer = window.setInterval(tick, intervalMs);
    return () => {
      window.clearInterval(timer);
      inFlight?.abort();
      inFlight = null;
    };
  }, [enabled, intervalMs]);
}

/**
 * A live fallback poll: fresh state matters more than finishing the previous
 * read, so each tick cancels the in-flight request and starts immediately.
 * Visibility is deliberately not checked; the owning surface decides whether a
 * hidden tab should keep its fallback alive.
 */
export function useAbortablePolling(
  callback: (signal: AbortSignal) => void | Promise<void>,
  intervalMs: number,
  enabled = true,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    let inFlight: AbortController | null = null;
    const tick = () => {
      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;
      void Promise.resolve(callbackRef.current(controller.signal)).finally(() => {
        if (inFlight === controller) inFlight = null;
      });
    };
    tick();
    const timer = window.setInterval(tick, intervalMs);
    return () => {
      window.clearInterval(timer);
      inFlight?.abort();
      inFlight = null;
    };
  }, [enabled, intervalMs]);
}

/**
 * A plain repeating check with no request lifecycle of its own. Used for local
 * liveness detection, where the callback reads a ref rather than the network.
 */
export function useTicker(callback: () => void, intervalMs: number, enabled = true): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => callbackRef.current(), intervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, intervalMs]);
}
