import type { RuntimeConnectionState } from '../features/runtime-status/useRuntimeStatus.js';
import type { WorkspaceDefinition } from './useWorkspace.js';

export function PageHero({
  current,
  state,
  runtimeEndpoint,
}: {
  readonly current: WorkspaceDefinition;
  readonly state: RuntimeConnectionState;
  readonly runtimeEndpoint: string;
}) {
  return (
    <header className={`page-hero page-hero-${current.id}`}>
      <div className="page-hero-copy">
        <p className="page-kicker">LOCAL CONTROL PLANE · v1.0</p>
        <h1 id="page-title">{current.title}</h1>
        <p className="page-description">{current.description}</p>
      </div>
      <aside className="page-aside" aria-label="当前工作区提示">
        <span className="page-aside-label">运行边界</span>
        <strong>{state === 'connected' ? '本机 Runtime 已连接' : '本机 Runtime 未就绪'}</strong>
        <span>{state === 'connected' ? `${runtimeEndpoint} · 执行与权限由海螺负责` : '执行与权限 · 海螺 Conchbase'}</span>
      </aside>
    </header>
  );
}
