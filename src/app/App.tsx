import { ConfigurationPanel } from '../features/configuration/ConfigurationPanel.js';
import { AgentWorkspace } from '../features/agents/AgentWorkspace.js';
import { RuntimeStatusPanel } from '../features/runtime-status/RuntimeStatusPanel.js';
import { TaskOperationsPanel } from '../features/task-operations/TaskOperationsPanel.js';

export function App() {
  return (
    <div className="shell">
      <aside className="rail" aria-label="主导航">
        <a className="brand-mark" href="#overview" aria-label="Pagurus 首页">P</a>
        <nav className="rail-nav">
          <a className="rail-link is-active" href="#overview" aria-current="page" aria-label="总览">⌂</a>
          <a className="rail-link" href="#agent-panel" aria-label="Agent 配置">◉</a>
          <span className="rail-link is-planned" aria-label="工具与连接配置入口建设中" title="工具与连接配置入口建设中">⌘</span>
          <span className="rail-link is-planned" aria-label="Skills 配置入口建设中" title="Skills 配置入口建设中">✳</span>
        </nav>
        <span className="rail-link rail-settings is-planned" aria-label="设置入口建设中" title="设置入口建设中">⚙</span>
      </aside>

      <main id="overview" className="main-content">
        <header className="topbar">
          <div className="wordmark"><span className="wordmark-symbol">◒</span> pagurus</div>
          <div className="profile-chip"><span className="avatar">F</span><span>本机配置</span></div>
        </header>

        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">LOCAL CONTROL PLANE <span>·</span> v0.2</p>
          <h1 id="page-title">你的 Agent，<em>由你配置。</em></h1>
          <p className="intro-copy">管理运行时、连接工具与 Skills。配置由海螺执行，寄居蟹负责让它清晰可控。</p>
        </section>

        <RuntimeStatusPanel />

        <AgentWorkspace />

        <TaskOperationsPanel />

        <ConfigurationPanel />

        <section className="next-section" aria-labelledby="next-title">
          <div className="section-heading">
            <div><p className="eyebrow">WORKSPACE</p><h2 id="next-title">管理空间</h2></div>
            <span className="muted-label">即将开放</span>
          </div>
          <div className="workspace-list">
            <a className="workspace-row is-live" id="tasks" href="#task-operations-title">
              <span className="row-icon icon-tools">↗</span>
              <span className="row-copy"><strong>任务运行</strong><small>创建、查看、取消和重试模型任务</small></span>
              <span className="row-state">已开放</span>
              <span className="row-arrow">↗</span>
            </a>
            <a className="workspace-row is-live" id="agents" href="#agent-title">
              <span className="row-icon icon-agent">A</span><span className="row-copy"><strong>Agent 配置</strong><small>管理独立版本、模型和任务身份</small></span><span className="row-state">已开放</span><span className="row-arrow">↗</span>
            </a>
            <a className="workspace-row is-live" href="#configuration-title">
              <span className="row-icon icon-agent">↻</span><span className="row-copy"><strong>运行时配置</strong><small>校验、应用与回滚全局策略配置</small></span><span className="row-state">已开放</span><span className="row-arrow">↗</span>
            </a>
            <div className="workspace-row is-planned" id="tools">
              <span className="row-icon icon-tools">⌘</span><span className="row-copy"><strong>工具与连接</strong><small>MCP 服务和逐项授权</small></span><span className="row-state">配置入口建设中</span><span className="row-arrow">↗</span>
            </div>
            <div className="workspace-row is-planned" id="skills">
              <span className="row-icon icon-skills">✳</span><span className="row-copy"><strong>Skills</strong><small>可复用的指令与工作方法</small></span><span className="row-state">配置入口建设中</span><span className="row-arrow">↗</span>
            </div>
          </div>
        </section>

        <footer className="page-footer"><span>Pagurus · 寄居蟹</span><span>配置在此管理，执行由 Conchbase 负责。</span></footer>
      </main>
    </div>
  );
}
