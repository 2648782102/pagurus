import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { decideOrganizationAttention } from '../../shared/api/organization.js';
import { PrimaryConversationPanel } from './PrimaryConversationPanel.js';
import { useOrganizationConsole } from './useOrganizationConsole.js';

const EVENT_LABELS: Readonly<Record<string, string>> = {
  'organization.intent_recorded': '主会话意图',
  'organization.project_opened': '项目创建',
  'organization.project_activated': '项目激活',
  'organization.agent_proposed': '员工提案',
  'organization.worker_authorized': '员工授权',
  'organization.worker_execution_recorded': '工作绑定',
  'organization.worker_started': '员工启动',
  'organization.report_recorded': '结构化汇报',
  'organization.attention_requested': '请求人工输入',
  'organization.attention_answered': '人工回答',
  'organization.attention_withdrawn': '人工撤回',
  'organization.project_quieted': '项目静默',
  'organization.worker_offboarded': '员工裁撤',
  'organization.project_archived': '项目归档',
  'organization.project_resumed': '项目恢复',
  'organization.worker_resumed': '员工恢复',
  'organization.delegation_revalidated': '委派重验',
};

function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type.replace('organization.', '');
}

export function OrganizationConsolePanel({ runtime }: { runtime: RuntimeInfo | null }) {
  const consoleState = useOrganizationConsole(runtime);

  return (
    <section className="work-panel organization-panel" id="organization-console" aria-labelledby="organization-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ORGANIZATION CONSOLE · 1.1.0</p>
          <h2 id="organization-title">组织状态</h2>
        </div>
        <div className="history-heading-actions">
          <label className="organization-toggle" htmlFor="organization-auto-refresh">
            <input
              id="organization-auto-refresh"
              type="checkbox"
              checked={consoleState.autoRefresh}
              onChange={(event) => consoleState.setAutoRefresh(event.target.checked)}
              disabled={!consoleState.supported}
            />
            自动刷新
          </label>
          <button
            className="button-secondary"
            type="button"
            onClick={consoleState.load}
            disabled={!consoleState.supported || consoleState.busy || consoleState.refreshing}
          >
            {consoleState.refreshing ? '读取中…' : '刷新组织状态'}
          </button>
        </div>
      </div>

      {consoleState.phase === 'checking' && <p className="task-hint" role="status">正在检查 1.1.0 组织契约…</p>}
      {consoleState.phase === 'unsupported' && (
        <div className="work-notice" role="status">
          <p>当前 Runtime 未发布 <code>organizationContract: 1.1.0</code>；组织控制台保持关闭。</p>
        </div>
      )}
      {consoleState.error && <div className="work-error" role="alert"><p>{consoleState.error}</p></div>}
      {consoleState.message && <p className="task-hint" role="status">{consoleState.message}</p>}
      {consoleState.lastUpdatedAt && <p className="muted-label">最近同步：{consoleState.lastUpdatedAt}</p>}

      {consoleState.supported && <>
        <PrimaryConversationPanel
          runtime={runtime}
          intentText={consoleState.intentText}
          busy={consoleState.busy}
          onIntentTextChange={consoleState.setIntentText}
          onSubmitIntent={async () => { await consoleState.submitIntent(); }}
          onDecideAttention={async (attentionId, expectedVersion, kind) => {
            await decideOrganizationAttention(attentionId, kind, expectedVersion);
            await consoleState.load();
          }}
        />

        <div className="organization-summary" aria-label="组织状态摘要">
          <div><strong>{consoleState.projects.length}</strong><span>项目</span></div>
          <div><strong>{consoleState.orderedAttention.filter((item) => item.state === 'open').length}</strong><span>待处理 Attention</span></div>
          <div><strong>{consoleState.proposals.length}</strong><span>员工提案</span></div>
          <div><strong>{consoleState.reports.length}</strong><span>结构化汇报</span></div>
          <div><strong>{consoleState.timeline.length}</strong><span>已发布事实</span></div>
        </div>

        <div className="organization-layout">
          <article className="organization-card organization-card-timeline" aria-labelledby="organization-timeline-title">
            <div className="section-heading">
              <h3 id="organization-timeline-title">主会话时间线</h3>
              <span className="muted-label">{consoleState.eventHasMore ? '可继续分页' : '已到最新'}</span>
            </div>
            {consoleState.timeline.length === 0 && <p className="task-hint">Runtime 尚未发布组织事件。</p>}
            <ol className="organization-timeline">
              {consoleState.timeline.map((event) => (
                <li key={event.id}>
                  <span className="organization-timeline-sequence">#{event.sequence}</span>
                  <span className="organization-timeline-copy">
                    <strong>{eventLabel(event.type)}</strong>
                    <code>{event.type}</code>
                    <small>{event.projectId}</small>
                  </span>
                </li>
              ))}
            </ol>
          </article>

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
              <div><dt>项目</dt><dd><code>{consoleState.selectedAttention.projectId}</code></dd></div>
              <div><dt>员工</dt><dd><code>{consoleState.selectedAttention.workerId}</code></dd></div>
            </dl>}
          </article>

          <article className="organization-card organization-card-projects" aria-labelledby="organization-project-title">
            <h3 id="organization-project-title">项目与归档</h3>
            {consoleState.projects.length === 0 && <p className="task-hint">Runtime 尚未发布项目。</p>}
            <div className="organization-project-list">
              {consoleState.projects.map((project) => (
                <button
                  className={`organization-project-row${project.id === consoleState.selectedProjectId ? ' is-selected' : ''}`}
                  key={project.id}
                  type="button"
                  onClick={() => consoleState.selectProject(project.id)}
                >
                  <strong>{project.state === 'archived' ? '归档' : project.state}</strong>
                  <code>{project.id}</code>
                </button>
              ))}
            </div>
            {consoleState.projectThreads && <div className="organization-threads">
              <h4>项目线程事实</h4>
              {consoleState.projectThreads.threads.length === 0 && <p className="task-hint">暂无项目线程事实。</p>}
              {consoleState.projectThreads.threads.slice(-12).reverse().map((thread) => (
                <p className="organization-fact" key={thread.eventId}>
                  <span>#{thread.sequence}</span><code>{thread.type}</code>
                </p>
              ))}
            </div>}
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
                <small>depth {delegation.maxDelegationDepth} · ttl #{delegation.expiresAtSequence}</small>
              </p>
            ))}
          </article>

          <article className="organization-card" aria-labelledby="organization-report-title">
            <h3 id="organization-report-title">结构化汇报</h3>
            {consoleState.reports.length === 0 && <p className="task-hint">Runtime 尚未发布报告。</p>}
            {[...consoleState.reports].reverse().map((report) => (
              <p className="organization-fact" key={report.id}>
                <span>#{report.sequence}</span><span>{report.state}</span>
                <code>{report.summaryDigest}</code>
              </p>
            ))}
          </article>

          <article className="organization-card" aria-labelledby="organization-work-title">
            <h3 id="organization-work-title">组织工作项</h3>
            {consoleState.workItems.length === 0 && <p className="task-hint">Runtime 尚未发布工作项视图。</p>}
            {consoleState.workItems.map((workItem) => (
              <p className="organization-fact" key={workItem.workItemId}>
                <code>{workItem.workItemId}</code><span>{workItem.state}</span>
                <small>{workItem.workerId}</small>
              </p>
            ))}
          </article>
        </div>
      </>}

      <p className="task-note">组织状态由 Conchbase 独占发布。Pagurus 不读写私有数据库、不计算授权、不把员工提案当成可执行的 Agent revision。</p>
    </section>
  );
}
