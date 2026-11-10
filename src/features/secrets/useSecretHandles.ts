import { useCallback, useEffect, useState } from 'react';
import {
  createSecretHandle,
  listSecretHandleUseReceipts,
  listSecretHandles,
  rotateSecretHandle,
  setSecretHandleStatus,
  supportsWriteOnlySecretHandles,
  useSecretHandle,
  type SecretHandleCreate,
  type SecretHandleRecord,
  type SecretHandleStatus,
  type SecretHandleUseReceipt,
  type SecretHandleUseWrite,
} from '../../shared/api/platform.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';

export type SecretPanelPhase = 'checking' | 'unsupported' | 'loading' | 'ready' | 'error';

export interface SecretPanelState {
  phase: SecretPanelPhase;
  handles: readonly SecretHandleRecord[];
  receipts: readonly SecretHandleUseReceipt[];
  error: string | null;
  pending: string | null;
  message: string | null;
}

export function useSecretHandles(runtime: RuntimeInfo | null) {
  const [state, setState] = useState<SecretPanelState>({
    phase: 'checking', handles: [], receipts: [], error: null, pending: null, message: null,
  });

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!runtime) {
      setState((current) => ({ ...current, phase: 'checking', error: null }));
      return;
    }
    if (!supportsWriteOnlySecretHandles(runtime)) {
      setState((current) => ({ ...current, phase: 'unsupported', error: null }));
      return;
    }
    setState((current) => ({ ...current, phase: 'loading', error: null }));
    try {
      const [handles, receipts] = await Promise.all([
        listSecretHandles(signal),
        listSecretHandleUseReceipts(signal),
      ]);
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'ready',
        handles: handles.handles,
        receipts: receipts.receipts,
        error: null,
      }));
    } catch (cause) {
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'error',
        error: cause instanceof Error ? cause.message : 'SecretHandle 元数据读取失败',
      }));
    }
  }, [runtime]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const run = useCallback(async (label: string, action: () => Promise<unknown>, message: string) => {
    if (!supportsWriteOnlySecretHandles(runtime)) {
      setState((current) => ({ ...current, phase: 'unsupported', error: null, pending: null }));
      return;
    }
    setState((current) => ({ ...current, pending: label, message: null }));
    try {
      await action();
      setState((current) => ({ ...current, pending: null, message }));
      await load();
    } catch (cause) {
      setState((current) => ({
        ...current,
        pending: null,
        error: cause instanceof Error ? cause.message : 'SecretHandle 操作失败',
      }));
    }
  }, [load, runtime]);

  return {
    ...state,
    load: () => void load(),
    create: (input: SecretHandleCreate) => void run('create', () => createSecretHandle(input), '只写值已提交并清除'),
    rotate: (handleId: string, value: string) => void run(`rotate:${handleId}`, () => rotateSecretHandle(handleId, value), '值已轮换并清除'),
    status: (handleId: string, status: SecretHandleStatus) => void run(
      `status:${handleId}`, () => setSecretHandleStatus(handleId, status), '状态已更新',
    ),
    use: (input: SecretHandleUseWrite) => void run(`use:${input.handleId}`, () => useSecretHandle(input), '固定适配器已返回摘要收据'),
  };
}
