import { useCallback, useState } from 'react';
import { ConfigurationPanel } from '../features/configuration/ConfigurationPanel.js';
import { AgentWorkspace } from '../features/agents/AgentWorkspace.js';
import { RuntimeStatusPanel } from '../features/runtime-status/RuntimeStatusPanel.js';
import { TaskOperationsPanel } from '../features/task-operations/TaskOperationsPanel.js';
import { TaskHistoryPanel } from '../features/task-history/TaskHistoryPanel.js';
import { AttentionWorkbenchPanel } from '../features/work/AttentionWorkbenchPanel.js';
import { CapabilityPanel } from '../features/capabilities/CapabilityPanel.js';
import { SecretHandlePanel } from '../features/secrets/SecretHandlePanel.js';
import { useRuntimeStatus } from '../features/runtime-status/useRuntimeStatus.js';

export function App() {
  const [agentRefreshToken, setAgentRefreshToken] = useState(0);
  const runtimeStatus = useRuntimeStatus();
  const handleAgentsChanged = useCallback(() => {
    setAgentRefreshToken((current) => current + 1);
  }, []);

  return (
    <div className="shell">
      <aside className="rail" aria-label="主导航">
        <a className="brand-mark" href="#overview" aria-label="Pagurus 首页">P</a>
        <nav className="rail-nav">
          <a className="rail-link is-active" href="#overview" aria-current="page" aria-label="总览">⌂</a>
          <a className="rail-link" href="#agent-panel" aria-label="Agent 配置">◉</a>
          <a className="rail-link" href="#workbench" aria-label="持久工作控制台">≋</a>
          <a className="rail-link" href="#capabilities" aria-label="能力目录">⌘</a>
          <a className="rail-link" href="#secrets" aria-label="敏感信息句柄">✳</a>
        </nav>
        <a className="rail-link rail-settings" href="#configuration-title" aria-label="运行时设置">⚙</a>
      </aside>

      <main id="overview" className="main-content">
        <header className="topbar">
          <div className="wordmark"><span className="wordmark-symbol">◒</span> pagurus</div>
          <div className="profile-chip"><span className="avatar">F</span><span>本机配置</span></div>
        </header>

        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">LOCAL CONTROL PLANE <span>·</span> v1.0</p>
          <h1 id="page-title">你的 Agent，<em>由你配置。</em></h1>
          <p className="intro-copy">管理运行时、能力目录与只写敏感信息。配置由海螺执行，寄居蟹负责让它清晰可控。</p>
        </section>

        <RuntimeStatusPanel {...runtimeStatus} />

        <AgentWorkspace onAgentsChanged={handleAgentsChanged} />

        <TaskOperationsPanel agentRefreshToken={agentRefreshToken} />

        <TaskHistoryPanel />

        <AttentionWorkbenchPanel runtime={runtimeStatus.runtime} />

        <CapabilityPanel runtime={runtimeStatus.runtime} />

        <SecretHandlePanel runtime={runtimeStatus.runtime} />

        <ConfigurationPanel />

        <section className="next-section" aria-labelledby="next-title">
          <div className="section-heading">
            <div><p className="eyebrow">WORKSPACE</p><h2 id="next-title">管理空间</h2></div>
            <span className="muted-label">本地优先 · 已开放</span>
          </div>
          <div className="workspace-list">
            <a className="workspace-row is-live" id="tasks" href="#task-operations-title">
              <span className="row-icon icon-tools">↗</span>
              <span className="row-copy"><strong>任务运行</strong><small>创建、查看、取消和重试模型任务</small></span>
              <span className="row-state">已开放</span>
              <span className="row-arrow">↗</span>
            </a>
            <a className="workspace-row is-live" href="#task-history-title">
              <span className="row-icon icon-tools">≋</span><span className="row-copy"><strong>任务历史</strong><small>按状态和 Agent 查看任务与固定版本</small></span><span className="row-state">已开放</span><span className="row-arrow">↗</span>
            </a>
            <a className="workspace-row is-live" href="#workbench-title">
              <span className="row-icon icon-tools">≋</span><span className="row-copy"><strong>持久工作</strong><small>控制工作项、查看恢复状态与交付证据</small></span><span className="row-state">已开放</span><span className="row-arrow">↗</span>
            </a>
            <a className="workspace-row is-live" id="agents" href="#agent-title">
              <span className="row-icon icon-agent">A</span><span className="row-copy"><strong>Agent 配置</strong><small>管理独立版本、模型和任务身份</small></span><span className="row-state">已开放</span><span className="row-arrow">↗</span>
            </a>
            <a className="workspace-row is-live" href="#configuration-title">
              <span className="row-icon icon-agent">↻</span><span className="row-copy"><strong>运行时配置</strong><small>校验、应用与回滚全局策略配置</small></span><span className="row-state">已开放</span><span className="row-arrow">↗</span>
            </a>
            <a className="workspace-row is-live" id="tools" href="#capability-title">
              <span className="row-icon icon-tools">⌘</span><span className="row-copy"><strong>能力目录</strong><small>记录 MCP、Skill、插件与句柄配置元数据</small></span><span className="row-state">已开放</span><span className="row-arrow">↗</span>
            </a>
            <a className="workspace-row is-live" id="skills" href="#secrets-title">
              <span className="row-icon icon-skills">✳</span><span className="row-copy"><strong>敏感信息</strong><small>只写提交、轮换、禁用与摘要收据</small></span><span className="row-state">已开放</span><span className="row-arrow">↗</span>
            </a>
          </div>
        </section>

        <footer className="page-footer"><span>Pagurus · 寄居蟹</span><span>配置在此管理，执行由 Conchbase 负责。</span></footer>
      </main>
    </div>
  );
}
