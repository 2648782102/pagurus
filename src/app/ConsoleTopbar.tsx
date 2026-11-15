import type { RuntimeConnectionState } from '../features/runtime-status/useRuntimeStatus.js';

const CONNECTION_LABELS: Readonly<Record<RuntimeConnectionState, string>> = {
  checking: '正在检查',
  connected: '已连接',
  disconnected: '未连接',
  incompatible: '版本不兼容',
} as const;

export function ConsoleTopbar({
  breadcrumb,
  state,
}: {
  readonly breadcrumb: string;
  readonly state: RuntimeConnectionState;
}) {
  return (
    <header className="console-topbar">
      <div className="breadcrumbs" aria-label="当前位置">
        <span>本机控制台</span><span aria-hidden="true">/</span><strong>{breadcrumb}</strong>
      </div>
      <div className="topbar-actions">
        <span className={`connection-badge status-${state}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {CONNECTION_LABELS[state]}
        </span>
        <span className="profile-chip"><span className="avatar">F</span><span>本机配置</span></span>
      </div>
    </header>
  );
}
