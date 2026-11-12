import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { useOrganizationConsole } from './useOrganizationConsole.js';

export function OrganizationConsolePanel({ runtime }: { runtime: RuntimeInfo | null }) {
  const consoleState = useOrganizationConsole(runtime);

  return (
    <section className="work-panel organization-panel" id="organization-console" aria-labelledby="organization-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ORGANIZATION CONSOLE · 1.1.0</p>
          <h2 id="organization-title">组织状态</h2>
        </div>
        <button
          className="button-secondary"
          type="button"
          onClick={consoleState.load}
          disabled={!consoleState.supported || consoleState.busy || consoleState.phase === 'loading'}
        >
          {consoleState.phase === 'loading' ? '读取中…' : '刷新组织状态'}
        </button>
      </div>

      {consoleState.phase === 'checking' && <p className="task-hint" role="status">正在检查 1.1.0 组织契约…</p>}
      {consoleState.phase === 'unsupported' && (
        <div className="work-notice" role="status">
          <p>当前 Runtime 未发布 <code>organizationContract: 1.1.0</code>；组织控制台保持关闭。</p>
        </div>
      )}
      {consoleState.error && <div className="work-error" role="alert"><p>{consoleState.error}</p></div>}
      {consoleState.message && <p className="task-hint" role="status">{consoleState.message}</p>}

      {consoleState.supported && <>
        <div className="organization-composer">
          <label htmlFor="organization-intent">主会话意图</label>
          <textarea
            id="organization-intent"
            value={consoleState.intentText}
            onChange={(event) => consoleState.setIntentText(event.target.value)}
            placeholder="例如：启动一个项目并安排后续规划；这里只提交用户意图，状态由 Conchbase 发布。"
            rows={3}
            disabled={consoleState.busy}
          />
          <button
            className="button-primary"
            type="button"
            onClick={consoleState.submitIntent}
            disabled={consoleState.busy || consoleState.intentText.trim().length === 0}
          >
            {consoleState.busy ? '提交中…' : '提交意图'}
          </button>
          <p className="task-note">202 仅代表意图被接受；项目、员工和委派状态必须等待 Runtime 发布，界面不会本地推演。</p>
        </div>

        <div className="organization-summary" aria-label="组织状态摘要">
          <div><strong>{consoleState.projects.length}</strong><span>项目</span></div>
          <div><strong>{consoleState.orderedAttention.filter((item) => item.state === 'open').length}</strong><span>待处理 Attention</span></div>
          <div><strong>{consoleState.proposals.length}</strong><span>员工提案</span></div>
          <div><strong>{consoleState.reports.length}</strong><span>结构化汇报</span></div>
        </div>

        <div className="organization-grid">
          <article className="organization-card" aria-labelledby="organization-attention-title">
            <h3 id="organization-attention-title">Attention 优先队列</h3>
            {consoleState.orderedAttention.length === 0 && <p className="task-hint">当前没有 AttentionRequest。</p>}
            {consoleState.orderedAttention.map((att) => (
              <div className="organization-attention-row" key={att.id}>
                <button type="button" onClick={() => consoleState.selectAttention(att.id)}>
                  <strong>{att.state === 'open' ? '待处理' : att.state}</strong>
                  <code>{att.id}</code>
                </button>
                {att.id === consoleState.selectedAttention?.id && att.state === 'open' && <>
                  <button className="button-primary" type="button" disabled={consoleState.busy}
                    onClick={() => consoleState.answerAttention(att)}>回答</button>
                  <button className="button-secondary" type="button" disabled={consoleState.busy}
                    onClick={() => consoleState.withdrawAttention(att)}>撤回</button>
                </>}
              </div>
            ))}
            {consoleState.selectedAttention && <dl className="history-detail-grid">
              <div><dt>questionDigest</dt><dd><code>{consoleState.selectedAttention.questionDigest}</code></dd></div>
              <div><dt>expectedVersion</dt><dd>{consoleState.selectedAttention.expectedVersion}</dd></div>
            </dl>}
          </article>

          <article className="organization-card" aria-labelledby="organization-project-title">
            <h3 id="organization-project-title">项目视图</h3>
            {consoleState.projects.length === 0 && <p className="task-hint">Runtime 尚未发布项目。</p>}
            {consoleState.projects.map((project) => (
              <p className="organization-fact" key={project.id}>
                <code>{project.id}</code><span>{project.state}</span>
              </p>
            ))}
          </article>

          <article className="organization-card" aria-labelledby="organization-proposal-title">
            <h3 id="organization-proposal-title">动态提案与委派审计</h3>
            {consoleState.proposals.length === 0 && <p className="task-hint">Runtime 尚未发布员工提案。</p>}
            {consoleState.proposals.map((proposal) => (
              <p className="organization-fact" key={proposal.workerId}>
                <code>{proposal.workerId}</code><span>{proposal.state}</span>
                <code>{proposal.instructionsDigest}</code>
              </p>
            ))}
            {consoleState.delegations.map((delegation) => (
              <p className="organization-fact" key={delegation.id}>
                <code>{delegation.id}</code><span>{delegation.state}</span>
              </p>
            ))}
          </article>

          <article className="organization-card" aria-labelledby="organization-report-title">
            <h3 id="organization-report-title">汇报、工作项与事件</h3>
            {consoleState.reports.length === 0 && consoleState.workItems.length === 0
              && <p className="task-hint">Runtime 尚未发布报告或工作项视图。</p>}
            {consoleState.reports.map((report) => (
              <p className="organization-fact" key={report.id}>
                <code>{report.id}</code><span>{report.state}</span><code>{report.summaryDigest}</code>
              </p>
            ))}
            {consoleState.recentEvents.map((event) => (
              <p className="organization-fact" key={event.id}>
                <span>#{event.sequence}</span><code>{event.type}</code>
              </p>
            ))}
          </article>
        </div>
      </>}

      <p className="task-note">组织状态由 Conchbase 独占发布。Pagurus 不读写私有数据库、不计算授权、不把员工提案当成可执行的 Agent revision。</p>
    </section>
  );
}
