import { useCallback, useEffect, useState } from 'react';
import {
  listCapabilities,
  putCapability,
  supportsCapabilityDirectory,
  type CapabilityRecord,
  type CapabilityWrite,
} from '../../shared/api/platform.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';

export type CapabilityPhase = 'checking' | 'unsupported' | 'loading' | 'ready' | 'error';

export interface CapabilityState {
  phase: CapabilityPhase;
  capabilities: readonly CapabilityRecord[];
  error: string | null;
  pending: boolean;
  message: string | null;
}

export function useCapabilities(runtime: RuntimeInfo | null) {
  const [state, setState] = useState<CapabilityState>({
    phase: 'checking', capabilities: [], error: null, pending: false, message: null,
  });

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!runtime) {
      setState((current) => ({ ...current, phase: 'checking', error: null }));
      return;
    }
    if (!supportsCapabilityDirectory(runtime)) {
      setState((current) => ({ ...current, phase: 'unsupported', error: null }));
      return;
    }
    setState((current) => ({ ...current, phase: 'loading', error: null }));
    try {
      const result = await listCapabilities(signal);
      if (signal?.aborted) return;
      setState((current) => ({ ...current, phase: 'ready', capabilities: result.capabilities, error: null }));
    } catch (cause) {
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'error',
        error: cause instanceof Error ? cause.message : '能力目录读取失败',
      }));
    }
  }, [runtime]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const submit = useCallback(async (input: CapabilityWrite) => {
    if (!supportsCapabilityDirectory(runtime)) {
      setState((current) => ({ ...current, phase: 'unsupported', error: null, pending: false }));
      return;
    }
    setState((current) => ({ ...current, pending: true, message: null }));
    try {
      await putCapability(input);
      setState((current) => ({ ...current, pending: false, message: '能力记录已保存' }));
      await load();
    } catch (cause) {
      setState((current) => ({
        ...current,
        pending: false,
        error: cause instanceof Error ? cause.message : '能力记录保存失败',
      }));
    }
  }, [load, runtime]);

  return { ...state, load: () => void load(), submit: (input: CapabilityWrite) => void submit(input) };
}
