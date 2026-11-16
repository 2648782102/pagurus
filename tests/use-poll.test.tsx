// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAbortablePolling, useTicker, useVisiblePolling } from '../src/shared/ui/use-poll.js';

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

function AbortPoller({
  onTick,
  enabled = true,
}: {
  readonly onTick: (signal: AbortSignal) => void;
  readonly enabled?: boolean;
}) {
  useAbortablePolling(onTick, 700, enabled);
  return null;
}

describe('abortable fallback polling', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('fires immediately and cancels the previous request on the next tick', () => {
    const signals: AbortSignal[] = [];
    const { unmount } = render(<AbortPoller onTick={(signal) => { signals.push(signal); }} />);

    expect(signals).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(700); });
    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    unmount();
    expect(signals[1]?.aborted).toBe(true);
  });

  it('stays idle while disabled', () => {
    const onTick = vi.fn();
    render(<AbortPoller onTick={onTick} enabled={false} />);

    act(() => { vi.advanceTimersByTime(2_100); });
    expect(onTick).not.toHaveBeenCalled();
  });
});

describe('ticker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('runs only while enabled and stops on unmount', () => {
    function Ticker({ onTick, enabled }: { readonly onTick: () => void; readonly enabled: boolean }) {
      useTicker(onTick, 5_000, enabled);
      return null;
    }

    const onTick = vi.fn();
    const { rerender, unmount } = render(<Ticker onTick={onTick} enabled={false} />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onTick).not.toHaveBeenCalled();

    rerender(<Ticker onTick={onTick} enabled />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onTick).toHaveBeenCalledTimes(2);

    unmount();
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onTick).toHaveBeenCalledTimes(2);
  });
});
