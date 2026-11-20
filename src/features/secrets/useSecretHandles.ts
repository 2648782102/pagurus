import { useCallback, useState } from 'react';
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
import { errorMessage } from '../../shared/ui/errors.js';
import { useAsyncResource } from '../../shared/ui/use-async-resource.js';

export interface SecretPanelState {
  phase: 'checking' | 'unsupported' | 'loading' | 'ready' | 'error';
  handles: readonly SecretHandleRecord[];
  receipts: readonly SecretHandleUseReceipt[];
  error: string | null;
  pending: string | null;
  message: string | null;
}

interface SecretPanelData {
  readonly handles: readonly SecretHandleRecord[];
  readonly receipts: readonly SecretHandleUseReceipt[];
}

export function useSecretHandles(runtime: RuntimeInfo | null) {
  const resource = useAsyncResource<SecretPanelData>({
    read: async (signal) => {
      const [handles, receipts] = await Promise.all([
        listSecretHandles(signal),
        listSecretHandleUseReceipts(signal),
      ]);
      return { handles: handles.handles, receipts: receipts.receipts };
    },
    failure: 'SecretHandle 元数据读取失败',
    precondition: () => {
      if (!runtime) return 'checking';
      return supportsWriteOnlySecretHandles(runtime) ? null : 'unsupported';
    },
    deps: [runtime],
  });

  /* Mutations are not reads; they track their own label and outcome. */
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const reload = resource.reload;

  const run = useCallback(async (label: string, action: () => Promise<unknown>, message: string) => {
    if (!supportsWriteOnlySecretHandles(runtime)) {
      setPending(null);
      return;
    }
    setPending(label);
    setMessage(null);
    setActionError(null);
    try {
      await action();
      setPending(null);
      setMessage(message);
      reload();
    } catch (cause) {
      setPending(null);
      setActionError(errorMessage(cause, 'SecretHandle 操作失败'));
    }
  }, [reload, runtime]);

  return {
    phase: resource.phase,
    handles: resource.data?.handles ?? [],
    receipts: resource.data?.receipts ?? [],
    error: resource.error ?? actionError,
    pending,
    message,
    load: reload,
    create: (input: SecretHandleCreate) => void run('create', () => createSecretHandle(input), '只写值已提交并清除'),
    rotate: (handleId: string, value: string) => void run(`rotate:${handleId}`, () => rotateSecretHandle(handleId, value), '值已轮换并清除'),
    status: (handleId: string, status: SecretHandleStatus) => void run(
      `status:${handleId}`, () => setSecretHandleStatus(handleId, status), '状态已更新',
    ),
    use: (input: SecretHandleUseWrite) => void run(`use:${input.handleId}`, () => useSecretHandle(input), '固定适配器已返回摘要收据'),
  };
}
