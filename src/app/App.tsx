import { useCallback, useState } from 'react';
import { AgentWorkspace } from '../features/agents/AgentWorkspace.js';
import { CapabilityPanel } from '../features/capabilities/CapabilityPanel.js';
import { ConfigurationPanel } from '../features/configuration/ConfigurationPanel.js';
import { RuntimeStatusPanel } from '../features/runtime-status/RuntimeStatusPanel.js';
import { useRuntimeStatus } from '../features/runtime-status/useRuntimeStatus.js';
import { SecretHandlePanel } from '../features/secrets/SecretHandlePanel.js';
import { TaskHistoryPanel } from '../features/task-history/TaskHistoryPanel.js';
import { TaskOperationsPanel } from '../features/task-operations/TaskOperationsPanel.js';
import { AttentionWorkbenchPanel } from '../features/work/AttentionWorkbenchPanel.js';
import { useWorkspace, type WorkspaceId } from './useWorkspace.js';

const CONNECTION_LABELS = {
  checking: '正在检查',
  connected: '已连接',
  disconnected: '未连接',
  incompatible: '版本不兼容',
} as const;

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

  const workspaceContent = (id: WorkspaceId) => {
    switch (id) {
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
        return <>
          <CapabilityPanel runtime={runtimeStatus.runtime} />
          <SecretHandlePanel runtime={runtimeStatus.runtime} />
        </>;
      case 'secrets':
        return <SecretHandlePanel runtime={runtimeStatus.runtime} />;
      case 'settings':
        return <ConfigurationPanel />;
      default:
        return <RuntimeStatusPanel {...runtimeStatus} />;
    }
  };

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
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span className="nav-icon" aria-hidden="true">{entry.icon}</span>
                <span className="sr-only">{entry.label}</span>
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
          <header className="page-hero">
            <div className="page-hero-copy">
              <p className="page-kicker">LOCAL CONTROL PLANE · v1.0</p>
              <h1 id="page-title">{current.title}</h1>
              <p className="page-description">{current.description}</p>
            </div>
            <aside className="page-aside" aria-label="当前工作区提示">
              <span className="page-aside-label">当前工作区</span>
              <strong>{current.label}</strong>
              <span>{workspace.workspaces.length} 个工作区 · 7 个已开放</span>
            </aside>
          </header>

          {workspace.active === 'overview' && <section className="overview-grid" aria-labelledby="next-title">
            <div className="section-heading overview-heading">
              <div>
                <p className="eyebrow">WORKSPACE</p>
                <h2 id="next-title">管理空间</h2>
              </div>
              <span className="muted-label">本地优先 · 全部已开放</span>
            </div>
            <div className="workspace-list">
              <a className="workspace-row is-live" id="tasks" href="#task-operations-title">
                <span className="row-icon icon-tools" aria-hidden="true">↗</span>
                <span className="row-copy"><strong>任务运行</strong><small>创建、查看、取消和重试模型任务</small></span>
                <span className="row-state">已开放</span><span className="row-arrow" aria-hidden="true">↗</span>
              </a>
              <a className="workspace-row is-live" href="#task-history-title">
                <span className="row-icon icon-tools" aria-hidden="true">≋</span>
                <span className="row-copy"><strong>任务历史</strong><small>按状态和 Agent 查看任务与固定版本</small></span>
                <span className="row-state">已开放</span><span className="row-arrow" aria-hidden="true">↗</span>
              </a>
              <a className="workspace-row is-live" href="#workbench-title">
                <span className="row-icon icon-tools" aria-hidden="true">≋</span>
                <span className="row-copy"><strong>持久工作</strong><small>控制工作项、查看恢复状态与交付证据</small></span>
                <span className="row-state">已开放</span><span className="row-arrow" aria-hidden="true">↗</span>
              </a>
              <a className="workspace-row is-live" id="agents" href="#agent-title">
                <span className="row-icon icon-agent" aria-hidden="true">A</span>
                <span className="row-copy"><strong>Agent 配置</strong><small>管理独立版本、模型和任务身份</small></span>
                <span className="row-state">已开放</span><span className="row-arrow" aria-hidden="true">↗</span>
              </a>
              <a className="workspace-row is-live" href="#configuration-title">
                <span className="row-icon icon-agent" aria-hidden="true">↻</span>
                <span className="row-copy"><strong>运行时配置</strong><small>校验、应用与回滚全局策略配置</small></span>
                <span className="row-state">已开放</span><span className="row-arrow" aria-hidden="true">↗</span>
              </a>
              <a className="workspace-row is-live" id="tools" href="#capability-title">
                <span className="row-icon icon-tools" aria-hidden="true">⌘</span>
                <span className="row-copy"><strong>能力目录</strong><small>记录 MCP、Skill、插件与句柄配置元数据</small></span>
                <span className="row-state">已开放</span><span className="row-arrow" aria-hidden="true">↗</span>
              </a>
              <a className="workspace-row is-live" id="skills" href="#secrets-title">
                <span className="row-icon icon-skills" aria-hidden="true">✳</span>
                <span className="row-copy"><strong>敏感信息</strong><small>只写提交、轮换、禁用与摘要收据</small></span>
                <span className="row-state">已开放</span><span className="row-arrow" aria-hidden="true">↗</span>
              </a>
            </div>
          </section>}

          <div className="workspace-content" aria-live="off">
            {workspaceContent(workspace.active)}
          </div>

          <footer className="page-footer"><span>Pagurus · 寄居蟹</span><span>配置在此管理，执行由 Conchbase 负责。</span></footer>
        </div>
      </main>
    </div>
  );
}
