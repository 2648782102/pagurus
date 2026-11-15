import { useEffect, useRef } from 'react';

/**
 * Run a callback on an interval without leaking in-flight work.
 *
 * The previous tick's request is aborted before a new one starts, the last
 * request is aborted on unmount, and hidden tabs skip the tick entirely.
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
      if (document.visibilityState !== 'visible') return;
      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;
      void callbackRef.current(controller.signal);
    };
    const timer = window.setInterval(tick, intervalMs);
    return () => {
      window.clearInterval(timer);
      inFlight?.abort();
      inFlight = null;
    };
  }, [enabled, intervalMs]);
}
