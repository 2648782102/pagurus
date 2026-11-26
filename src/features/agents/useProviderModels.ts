import { useEffect, useState } from 'react';
import { listProviderModels, type ProviderModel } from '../../shared/api/agents.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';

/** Reads the model catalog for the settings surface. */
export function useProviderModels(runtime: RuntimeInfo | null) {
  const [models, setModels] = useState<readonly ProviderModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runtime) return;
    let active = true;
    listProviderModels()
      .then((value) => { if (active) setModels(value); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : '模型目录读取失败');
      });
    return () => { active = false; };
  }, [runtime]);

  return { models, error };
}
