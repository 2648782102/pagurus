import { useCallback, useEffect, useState } from 'react';
import {
  getRuntimeHealth,
  getRuntimeInfo,
  type RuntimeHealth,
  type RuntimeInfo,
} from '../../shared/api/runtime.js';
import { UnsupportedRuntimeApiError } from '../../shared/api/errors.js';

export type RuntimeConnectionState =
  | 'checking'
  | 'connected'
  | 'disconnected'
  | 'incompatible';

export interface RuntimeConnectionError {
  kind: 'connection' | 'incompatible';
  message: string;
}

export function useRuntimeStatus() {
  const [state, setState] = useState<RuntimeConnectionState>('checking');
  const [health, setHealth] = useState<RuntimeHealth | null>(null);
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [error, setError] = useState<RuntimeConnectionError | null>(null);

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
      if (cause instanceof UnsupportedRuntimeApiError) {
        setError({
          kind: 'incompatible',
          message: `Runtime API 版本不受支持，当前控制台需要 v${cause.expectedApiVersion}。`,
        });
        setState('incompatible');
        return;
      }

      setError({
        kind: 'connection',
        message: cause instanceof Error ? cause.message : '无法连接到 Runtime',
      });
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
