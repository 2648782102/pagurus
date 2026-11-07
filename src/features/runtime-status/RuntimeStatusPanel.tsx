import { useRuntimeStatus } from './useRuntimeStatus.js';

export function RuntimeStatusPanel() {
  const { state, health, runtime, error, refresh } = useRuntimeStatus();
  const statusText = {
    checking: '正在检查连接',
    connected: '运行时已连接',
    disconnected: '运行时未连接',
    incompatible: 'API 版本不兼容',
  }[state];

  const errorMessage = error?.kind === 'incompatible'
    ? `${error.message}请升级寄居蟹，或连接兼容版本的 Conchbase 后重试。`
    : error
      ? `${error.message}。启动 Conchbase 后可以重新连接。`
      : null;

  return (
    <section className={`runtime-panel status-${state}`} aria-labelledby="runtime-title">
      <div className="runtime-heading">
        <div>
          <p className="eyebrow">RUNTIME</p>
          <h2 id="runtime-title">海螺 Conchbase</h2>
        </div>
        <span className="status-pill"><span className="status-dot" />{statusText}</span>
      </div>

      <div className="runtime-details" aria-live="polite">
        <div><span className="detail-label">地址</span><code>127.0.0.1:4318</code></div>
        <div><span className="detail-label">API 版本</span><code>{health ? `v${health.apiVersion}` : '—'}</code></div>
        <div><span className="detail-label">Runtime 版本</span><code>{runtime?.version ?? '—'}</code></div>
        <div><span className="detail-label">能力数</span><code>{runtime?.capabilities.length ?? '—'}</code></div>
        <div><span className="detail-label">状态</span><code>{health?.status ?? (state === 'checking' ? '检查中' : '离线')}</code></div>
      </div>

      {errorMessage && (
        <p className="error-message" role="status">{errorMessage}</p>
      )}

      <div className="runtime-footer">
        <span className="connection-note">这里读取 Runtime 状态；任务执行和权限由海螺负责。</span>
        <button className="button-secondary" type="button" onClick={() => void refresh()} disabled={state === 'checking'}>
          {state === 'checking' ? '检查中…' : '重新连接'}
        </button>
      </div>
    </section>
  );
}
