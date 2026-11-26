import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { useProviderModels } from './useProviderModels.js';

/** Read-only model facts; the conversation composer remains the model control. */
export function ModelSettingsPanel({ runtime }: { readonly runtime: RuntimeInfo | null }) {
  const { models, error } = useProviderModels(runtime);
  return (
    <section className="agent-settings-model" aria-label="模型">
      <h3>模型目录</h3>
      {error !== null && <p role="alert">{error}</p>}
      {error === null && models.length === 0 && <p>正在读取模型目录…</p>}
      <ul>
        {models.map((model) => (
          <li key={model.reference}>
            <strong>{model.displayName}</strong>
            <code>{model.reference}</code>
          </li>
        ))}
      </ul>
      <p>在输入框上方切换当前对话使用的模型。</p>
    </section>
  );
}
