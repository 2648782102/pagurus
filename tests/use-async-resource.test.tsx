// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAsyncResource } from '../src/shared/ui/use-async-resource.js';

afterEach(() => vi.restoreAllMocks());

describe('useAsyncResource', () => {
  it('goes loading → ready and publishes the data', async () => {
    const read = vi.fn(async () => 'value');
    const { result } = renderHook(() => useAsyncResource({ read, failure: '失败' }));
    expect(result.current.phase).toBe('loading');
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(result.current.data).toBe('value');
    expect(result.current.error).toBeNull();
  });

  it('goes loading → error and prefers the thrown message over the fallback', async () => {
    /*
     * A string failure is the fallback sentence, not a replacement for the
     * cause. The thrown message is usually the more specific one, and dropping
     * it would collapse every distinct outage into the same generic line.
     */
    const read = vi.fn(async () => { throw new Error('上游不可用'); });
    const { result } = renderHook(() => useAsyncResource({ read, failure: '读取失败' }));
    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.error).toBe('上游不可用');
    expect(result.current.data).toBeNull();
  });

  it('falls back to the copy when the thrown value carries no message', async () => {
    const read = vi.fn(async () => { throw new Error('   '); });
    const { result } = renderHook(() => useAsyncResource({ read, failure: '读取失败' }));
    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.error).toBe('读取失败');
  });

  it('accepts a failure function so a caller can build the message', async () => {
    const read = vi.fn(async () => { throw new Error('boom'); });
    const { result } = renderHook(() =>
      useAsyncResource({ read, failure: (cause) => `含原因：${(cause as Error).message}` }));
    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.error).toBe('含原因：boom');
  });

  describe('preconditions', () => {
    it('sits in the given phase without reading', () => {
      const read = vi.fn(async () => 'value');
      const { result } = renderHook(() =>
        useAsyncResource({ read, failure: '失败', precondition: () => 'checking' }));
      expect(result.current.phase).toBe('checking');
      expect(read).not.toHaveBeenCalled();
    });

    it('reports unsupported without reading, and that is not an error', () => {
      const read = vi.fn(async () => 'value');
      const { result } = renderHook(() =>
        useAsyncResource({ read, failure: '失败', precondition: () => 'unsupported' }));
      expect(result.current.phase).toBe('unsupported');
      expect(result.current.error).toBeNull();
      expect(read).not.toHaveBeenCalled();
    });

    it('starts reading once the precondition clears', async () => {
      const read = vi.fn(async () => 'value');
      const { result, rerender } = renderHook(
        ({ gateValue }: { gateValue: 'checking' | null }) =>
          useAsyncResource({ read, failure: '失败', precondition: () => gateValue, deps: [gateValue] }),
        { initialProps: { gateValue: 'checking' as 'checking' | null } },
      );
      expect(result.current.phase).toBe('checking');
      rerender({ gateValue: null });
      await waitFor(() => expect(result.current.phase).toBe('ready'));
      expect(result.current.data).toBe('value');
    });
  });

  describe('aborts', () => {
    it('does not publish a result that lands after unmount', async () => {
      const pending: { release: ((value: string) => void) | null } = { release: null };
      const read = vi.fn(() => new Promise<string>((resolve) => { pending.release = resolve; }));
      const onLate = vi.fn();
      const { unmount } = renderHook(() => {
        const resource = useAsyncResource({ read, failure: '失败' });
        if (resource.data !== null) onLate(resource.data);
        return resource;
      });
      unmount();
      /* The request resolves after the component is gone. */
      pending.release?.('late');
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(onLate).not.toHaveBeenCalled();
    });

    it('ignores a stale read when the deps change mid-flight', async () => {
      /*
       * The classic shape: read A is slow, the caller switches to B, B returns
       * first, then A returns. Publishing A would show the wrong panel's data.
       */
      const resolvers: Record<string, (value: string) => void> = {};
      const read = vi.fn((signal: AbortSignal, key: string) =>
        new Promise<string>((resolve) => { resolvers[key] = resolve; signal.addEventListener('abort', () => resolve('aborted')); }));
      const { result, rerender } = renderHook(
        ({ key }: { key: string }) =>
          useAsyncResource({
            read: (signal) => read(signal, key),
            failure: '失败',
            deps: [key],
          }),
        { initialProps: { key: 'a' } },
      );
      await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
      rerender({ key: 'b' });
      await waitFor(() => expect(read).toHaveBeenCalledTimes(2));

      /* B lands first, then the abandoned A. */
      resolvers.b!('B');
      await waitFor(() => expect(result.current.data).toBe('B'));
      resolvers.a!('A');
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(result.current.data).toBe('B');
      expect(result.current.phase).toBe('ready');
    });
  });

  it('re-reads on reload', async () => {
    let calls = 0;
    const read = vi.fn(async () => `value-${++calls}`);
    const { result } = renderHook(() => useAsyncResource({ read, failure: '失败' }));
    await waitFor(() => expect(result.current.data).toBe('value-1'));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe('value-2'));
  });

  it('stays ready while a reload is in flight, so the panel does not blank', async () => {
    /*
     * A reload after the first success must not blank the panel. Panels gate
     * their rows on `ready`, so dropping to `loading` would make the table
     * disappear and come back — and clear a form the reader was filling in.
     */
    let call = 0;
    const read = vi.fn(() => {
      call += 1;
      return call === 1 ? Promise.resolve('first') : new Promise<string>(() => undefined);
    });
    const { result } = renderHook(() => useAsyncResource({ read, failure: '失败' }));
    await waitFor(() => expect(result.current.data).toBe('first'));
    act(() => result.current.reload());
    expect(result.current.phase).toBe('ready');
    expect(result.current.data).toBe('first');
  });

  it('lets a caller update data without a round trip', async () => {
    const read = vi.fn(async () => 'server');
    const { result } = renderHook(() => useAsyncResource({ read, failure: '失败' }));
    await waitFor(() => expect(result.current.data).toBe('server'));
    act(() => result.current.setData('local'));
    expect(result.current.data).toBe('local');
  });
});
