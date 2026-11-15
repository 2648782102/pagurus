import type { RuntimeInfo } from '../../shared/api/runtime.js';
import type { RuntimeConnectionState, RuntimeConnectionError } from './useRuntimeStatus.js';
import type { RuntimeHealth } from '../../shared/api/runtime.js';

export function RuntimeStatusPanel({
  state,
  health,
  runtime,
  error,
  refresh,
}: {
  state: RuntimeConnectionState;
  health: RuntimeHealth | null;
  runtime: RuntimeInfo | null;
  error: RuntimeConnectionError | null;
  refresh: (signal?: AbortSignal) => Promise<void>;
}) {
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

  const executionModeLabel = runtime?.executionMode === 'unrestricted'
    ? '完全放开（工具不经审批直接执行）'
    : runtime?.executionMode === 'restricted'
      ? '限制模式（写操作与外部操作需审批）'
      : null;

  const isUnrestricted = runtime?.executionMode === 'unrestricted';
  const budget = runtime?.loopBudget;

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
        {executionModeLabel && (
          <div>
            <span className="detail-label">执行模式</span>
            <code className={isUnrestricted ? 'is-unrestricted' : undefined}>
              {executionModeLabel}
            </code>
          </div>
        )}
        {budget && (
          <div>
            <span className="detail-label">循环预算</span>
            <code className="budget-value">
              {budget.maxIterations} 轮 · 每轮 {budget.maxToolCallsPerTurn} 次工具 · {Math.round(budget.deadlineMs / 1000)} 秒
            </code>
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="error-message" role="status">{errorMessage}</p>
      )}

      {isUnrestricted && (
        <div className="mode-warning" role="status">
          <strong>完全放开模式已启用</strong>
          <p>
            这个 Runtime 里，Agent 被授权的工具会直接执行，不会停下来等你确认。适用于一次性工作区、
            沙箱机器或你完全信任的场景；在存放真实凭据和个人数据的机器上请改用限制模式。
          </p>
        </div>
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
