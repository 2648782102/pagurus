import { useCallback, useEffect, useState } from 'react';
import {
  getRuntimeHealth,
  getRuntimeInfo,
  type RuntimeHealth,
  type RuntimeInfo,
} from '../../shared/api/runtime.js';

export type RuntimeConnectionState = 'checking' | 'connected' | 'disconnected';

export function useRuntimeStatus() {
  const [state, setState] = useState<RuntimeConnectionState>('checking');
  const [health, setHealth] = useState<RuntimeHealth | null>(null);
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setState('checking');
    setError(null);

    try {
      const [healthResult, runtimeResult] = await Promise.all([
        getRuntimeHealth(signal),
        getRuntimeInfo(signal),
      ]);
      setHealth(healthResult);
      setRuntime(runtimeResult);
      setState('connected');
    } catch (cause) {
      if (signal?.aborted) return;
      setError(cause instanceof Error ? cause.message : '无法连接到 Runtime');
      setState('disconnected');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return { state, health, runtime, error, refresh };
}
