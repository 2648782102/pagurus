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
