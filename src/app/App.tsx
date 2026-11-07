import { RuntimeStatusPanel } from '../features/runtime-status/RuntimeStatusPanel.js';

export function App() {
  return (
    <div className="shell">
      <aside className="rail" aria-label="主导航">
        <a className="brand-mark" href="#overview" aria-label="Pagurus 首页">P</a>
        <nav className="rail-nav">
          <a className="rail-link is-active" href="#overview" aria-current="page" aria-label="总览">⌂</a>
          <a className="rail-link" href="#agents" aria-label="Agents">◉</a>
          <a className="rail-link" href="#tools" aria-label="工具与连接">⌘</a>
          <a className="rail-link" href="#skills" aria-label="Skills">✳</a>
        </nav>
        <a className="rail-link rail-settings" href="#settings" aria-label="设置">⚙</a>
      </aside>

      <main id="overview" className="main-content">
        <header className="topbar">
          <div className="wordmark"><span className="wordmark-symbol">◒</span> pagurus</div>
          <div className="profile-chip"><span className="avatar">F</span><span>本机配置</span></div>
        </header>

        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">LOCAL CONTROL PLANE <span>·</span> v0.1</p>
          <h1 id="page-title">你的 Agent，<em>由你配置。</em></h1>
          <p className="intro-copy">管理运行时、连接工具与 Skills。配置由海螺执行，寄居蟹负责让它清晰可控。</p>
        </section>

        <RuntimeStatusPanel />

        <section className="next-section" aria-labelledby="next-title">
          <div className="section-heading">
            <div><p className="eyebrow">WORKSPACE</p><h2 id="next-title">管理空间</h2></div>
            <span className="muted-label">即将开放</span>
          </div>
          <div className="workspace-list">
            <a className="workspace-row" id="agents" href="#agents">
              <span className="row-icon icon-agent">A</span><span className="row-copy"><strong>Agents</strong><small>模型、身份与运行配置</small></span><span className="row-state">配置入口建设中</span><span className="row-arrow">↗</span>
            </a>
            <a className="workspace-row" id="tools" href="#tools">
              <span className="row-icon icon-tools">⌘</span><span className="row-copy"><strong>工具与连接</strong><small>MCP 服务和逐项授权</small></span><span className="row-state">配置入口建设中</span><span className="row-arrow">↗</span>
            </a>
            <a className="workspace-row" id="skills" href="#skills">
              <span className="row-icon icon-skills">✳</span><span className="row-copy"><strong>Skills</strong><small>可复用的指令与工作方法</small></span><span className="row-state">配置入口建设中</span><span className="row-arrow">↗</span>
            </a>
          </div>
        </section>

        <footer className="page-footer"><span>Pagurus · 寄居蟹</span><span>配置在此管理，执行由 Conchbase 负责。</span></footer>
      </main>
    </div>
  );
}
