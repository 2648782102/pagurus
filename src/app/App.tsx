import { useCallback, useState } from 'react';
import { AgentWorkspace } from '../features/agents/AgentWorkspace.js';
import { AgentChatPanel } from '../features/agent-chat/AgentChatPanel.js';
import { CapabilityPanel } from '../features/capabilities/CapabilityPanel.js';
import { ConfigurationPanel } from '../features/configuration/ConfigurationPanel.js';
import { ExecutionConsolePanel } from '../features/execution/ExecutionConsolePanel.js';
import { OrganizationConsolePanel } from '../features/organization/OrganizationConsolePanel.js';
import { RuntimeStatusPanel } from '../features/runtime-status/RuntimeStatusPanel.js';
import { useRuntimeStatus } from '../features/runtime-status/useRuntimeStatus.js';
import { SecretHandlePanel } from '../features/secrets/SecretHandlePanel.js';
import { TaskHistoryPanel } from '../features/task-history/TaskHistoryPanel.js';
import { TaskOperationsPanel } from '../features/task-operations/TaskOperationsPanel.js';
import { AttentionWorkbenchPanel } from '../features/work/AttentionWorkbenchPanel.js';
import { Section } from '../shared/ui/primitives.js';
import { useWorkspace, type WorkspaceId } from './useWorkspace.js';

const CONNECTION_LABELS = {
  checking: '正在检查',
  connected: '已连接',
  disconnected: '未连接',
  incompatible: '版本不兼容',
} as const;

const OVERVIEW_GROUPS = [
  {
    title: '组织与对话',
    note: '把目标交给老板 Agent，或直接与一个配置好的 Agent 对话。',
    ids: ['organization', 'agentChat'],
  },
  {
    title: '运行与审计',
    note: '查看任务、持久工作与每一次受控执行的证据。',
    ids: ['tasks', 'work', 'execution'],
  },
  {
    title: '构建与管理',
    note: '维护 Agent 版本、运行时策略、能力记录与只写句柄。',
    ids: ['agents', 'settings', 'capabilities', 'secrets'],
  },
] as const;

const QUICK_STARTS = ['organization', 'agentChat', 'tasks'] as const;

export function App() {
  const [agentRefreshToken, setAgentRefreshToken] = useState(0);
  const runtimeStatus = useRuntimeStatus();
  const workspace = useWorkspace();
  const current = workspace.current;
  const handleAgentsChanged = useCallback(() => {
    setAgentRefreshToken((value) => value + 1);
  }, []);
  const focusMain = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById('workspace-content')?.focus({ preventScroll: true });
  }, []);
  const activeBreadcrumb = current.id === 'overview' ? current.label : current.section;
  const workspaceById = new Map(workspace.workspaces.map((entry) => [entry.id, entry]));

  const workspaceContent = (id: WorkspaceId) => {
    switch (id) {
      case 'organization':
        return <OrganizationConsolePanel runtime={runtimeStatus.runtime} />;
      case 'agentChat':
        return <AgentChatPanel runtime={runtimeStatus.runtime} />;
      case 'execution':
        return <ExecutionConsolePanel runtime={runtimeStatus.runtime} />;
      case 'agents':
        return <AgentWorkspace onAgentsChanged={handleAgentsChanged} />;
      case 'tasks':
        return <>
          <TaskOperationsPanel agentRefreshToken={agentRefreshToken} />
          <TaskHistoryPanel />
        </>;
      case 'work':
        return <AttentionWorkbenchPanel runtime={runtimeStatus.runtime} />;
      case 'capabilities':
        return <CapabilityPanel runtime={runtimeStatus.runtime} />;
      case 'secrets':
        return <SecretHandlePanel runtime={runtimeStatus.runtime} />;
      case 'settings':
        return <ConfigurationPanel />;
      default:
        return null;
    }
  };

  const overviewContent = (
    <>
      <section className="overview-deck" aria-labelledby="overview-deck-title">
        <div className="overview-runtime">
          <RuntimeStatusPanel {...runtimeStatus} />
        </div>
        <aside className="overview-launch" aria-labelledby="overview-deck-title">
          <p className="eyebrow">从这里开始</p>
          <h2 id="overview-deck-title">选一个入口</h2>
          <p className="overview-launch-note">
            海螺负责执行与权限；这个控制台只读取已发布状态，并提交 Runtime 已接受的操作。
          </p>
          <div className="overview-quick-list">
            {QUICK_STARTS.map((id) => {
              const entry = workspaceById.get(id);
              if (!entry) return null;
              return (
                <a className="overview-quick-link" href={entry.href} key={entry.id}>
                  <span className="overview-quick-icon" aria-hidden="true">{entry.icon}</span>
                  <span>
                    <strong>{entry.label}</strong>
                    <small>{entry.hint}</small>
                  </span>
                  <span className="overview-quick-arrow" aria-hidden="true">↗</span>
                </a>
              );
            })}
          </div>
        </aside>
      </section>

      <Section
        className="overview-directory"
        id="directory-title"
        title="管理空间"
        description={`本地优先 · ${workspace.workspaces.length} 个工作区`}
      >
        <div className="directory-groups">
          {OVERVIEW_GROUPS.map((group) => (
            <article className="directory-group" key={group.title}>
              <h3>{group.title}</h3>
              <p>{group.note}</p>
              <div className="directory-list">
                {group.ids.map((id) => {
                  const entry = workspaceById.get(id);
                  if (!entry) return null;
                  const label = entry.id === 'settings' ? '运行时配置' : entry.label;
                  return (
                    <a className="directory-link" href={entry.href} key={entry.id}>
                      <span className="directory-icon" aria-hidden="true">{entry.icon}</span>
                      <span className="directory-copy">
                        <strong>{label}</strong>
                        <small>{entry.hint}</small>
                      </span>
                      <span className="directory-arrow" aria-hidden="true">→</span>
                    </a>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </Section>
    </>
  );

  return (
    <div className="shell">
      <a className="skip-link" href="#workspace-content" onClick={focusMain}>跳到控制台内容</a>

      <aside className="sidebar" aria-label="控制台导航">
        <a className="sidebar-brand" href="#overview" aria-label="Pagurus 控制台首页">
          <span className="brand-mark">P</span>
          <span className="brand-copy"><strong>pagurus</strong><small>寄居蟹控制台</small></span>
        </a>

        <nav className="sidebar-nav" aria-label="工作区">
          {workspace.workspaces.map((entry, index) => {
            const isActive = entry.id === workspace.active;
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

      <main id="workspace-content" className="console-main" tabIndex={-1}>
        <header className="console-topbar">
          <div className="breadcrumbs" aria-label="当前位置">
            <span>本机控制台</span><span aria-hidden="true">/</span><strong>{activeBreadcrumb}</strong>
          </div>
          <div className="topbar-actions">
            <span className={`connection-badge status-${runtimeStatus.state}`} role="status">
              <span className="status-dot" aria-hidden="true" />
              {CONNECTION_LABELS[runtimeStatus.state]}
            </span>
            <span className="profile-chip"><span className="avatar">F</span><span>本机配置</span></span>
          </div>
        </header>

        <div className="workspace-page">
          <header className={`page-hero page-hero-${current.id}`}>
            <div className="page-hero-copy">
              <p className="page-kicker">LOCAL CONTROL PLANE · v1.0</p>
              <h1 id="page-title">{current.title}</h1>
              <p className="page-description">{current.description}</p>
            </div>
            <aside className="page-aside" aria-label="当前工作区提示">
              <span className="page-aside-label">运行边界</span>
              <strong>{runtimeStatus.state === 'connected' ? '本机 Runtime 已连接' : '本机 Runtime 未就绪'}</strong>
              <span>执行与权限 · 海螺 Conchbase</span>
            </aside>
          </header>

          <div className="workspace-content" aria-live="off">
            {workspace.active === 'overview' ? overviewContent : workspaceContent(workspace.active)}
          </div>

          <footer className="page-footer"><span>Pagurus · 寄居蟹</span><span>配置在此管理，执行由 Conchbase 负责。</span></footer>
        </div>
      </main>
    </div>
  );
}
