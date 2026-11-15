// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVisiblePolling } from '../src/shared/ui/use-poll.js';

let visibility: DocumentVisibilityState = 'visible';

function Poller({
  onTick,
}: {
  readonly onTick: (signal: AbortSignal) => void;
}) {
  useVisiblePolling(onTick, 4000);
  return null;
}

describe('visible polling', () => {
  beforeEach(() => {
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('does not start a second tick while the first request is still running', async () => {
    const signals: AbortSignal[] = [];
    let resolveFirst: (() => void) | undefined;
    const { unmount } = render(<Poller onTick={(signal) => {
      signals.push(signal);
      if (signals.length === 1) {
        return new Promise<void>((resolve) => { resolveFirst = resolve; });
      }
    }} />);

    act(() => { vi.advanceTimersByTime(4000); });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(signals).toHaveLength(1);

    await act(async () => {
      resolveFirst?.();
      await Promise.resolve();
    });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(false);

    unmount();
    expect(signals[1]?.aborted).toBe(true);
  });

  it('aborts the last in-flight request on unmount', () => {
    const signals: AbortSignal[] = [];
    const { unmount } = render(<Poller onTick={(signal) => signals.push(signal)} />);

    act(() => { vi.advanceTimersByTime(4000); });

    expect(signals).toHaveLength(1);
    expect(signals[0]?.aborted).toBe(false);

    unmount();
    expect(signals[0]?.aborted).toBe(true);
  });

  it('skips hidden tabs and resumes when visible again', () => {
    const onTick = vi.fn();
    render(<Poller onTick={onTick} />);

    visibility = 'hidden';
    act(() => { vi.advanceTimersByTime(4000); });
    expect(onTick).not.toHaveBeenCalled();

    visibility = 'visible';
    act(() => { vi.advanceTimersByTime(4000); });
    expect(onTick).toHaveBeenCalledTimes(1);
  });
});
