import type { WorkspaceDefinition } from './useWorkspace.js';

export function ConsoleSidebar({
  workspaces,
  active,
}: {
  readonly workspaces: readonly WorkspaceDefinition[];
  readonly active: WorkspaceDefinition['id'];
}) {
  return (
    <aside className="sidebar" aria-label="控制台导航">
      <a className="sidebar-brand" href="#overview" aria-label="Pagurus 控制台首页">
        <span className="brand-mark">P</span>
        <span className="brand-copy"><strong>pagurus</strong><small>寄居蟹控制台</small></span>
      </a>

      <nav className="sidebar-nav" aria-label="工作区">
        {workspaces.map((entry, index) => {
          const isActive = entry.id === active;
          return (
            <a
              className={`nav-link${isActive ? ' is-active' : ''}`}
              key={entry.id}
              href={entry.href}
              aria-label={`${entry.label}：${entry.hint}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <span className="nav-icon" aria-hidden="true">{entry.icon}</span>
              <span className="nav-copy"><strong>{entry.label}</strong><small>{entry.hint}</small></span>
            </a>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <p className="sidebar-foot-label">执行边界</p>
        <p>配置在寄居蟹，执行与权限由海螺 Conchbase 负责。</p>
      </div>
    </aside>
  );
}
