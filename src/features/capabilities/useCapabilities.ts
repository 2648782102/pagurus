import { useCallback, useState } from 'react';
import {
  listCapabilities,
  putCapability,
  supportsCapabilityDirectory,
  type CapabilityRecord,
  type CapabilityWrite,
} from '../../shared/api/platform.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { errorMessage } from '../../shared/ui/errors.js';
import { useAsyncResource } from '../../shared/ui/use-async-resource.js';

export interface CapabilityState {
  phase: 'checking' | 'unsupported' | 'loading' | 'ready' | 'error';
  capabilities: readonly CapabilityRecord[];
  error: string | null;
  pending: boolean;
  message: string | null;
}

export function useCapabilities(runtime: RuntimeInfo | null) {
  const resource = useAsyncResource<readonly CapabilityRecord[]>({
    read: async (signal) => (await listCapabilities(signal)).capabilities,
    failure: '能力目录读取失败',
    /*
     * Two reasons not to read, and neither is an error: no Runtime has been
     * reached yet, or this one does not serve the directory. `runtime` is in
     * `deps` because the gate reads it — without that the panel would sit in
     * `checking` after the Runtime arrives.
     */
    precondition: () => {
      if (!runtime) return 'checking';
      return supportsCapabilityDirectory(runtime) ? null : 'unsupported';
    },
    deps: [runtime],
  });

  /* The write half is not a read, so it keeps its own progress and notice. */
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const reload = resource.reload;

  const submit = useCallback(async (input: CapabilityWrite) => {
    if (!supportsCapabilityDirectory(runtime)) {
      setPending(false);
      return;
    }
    setPending(true);
    setMessage(null);
    setWriteError(null);
    try {
      await putCapability(input);
      setPending(false);
      setMessage('能力记录已保存');
      reload();
    } catch (cause) {
      setPending(false);
      setWriteError(errorMessage(cause, '能力记录保存失败'));
    }
  }, [reload, runtime]);

  return {
    phase: resource.phase,
    capabilities: resource.data ?? [],
    /* A failed write is the error the reader can act on; a failed read outranks it. */
    error: resource.error ?? writeError,
    pending,
    message,
    load: reload,
    submit: (input: CapabilityWrite) => void submit(input),
  };
}
