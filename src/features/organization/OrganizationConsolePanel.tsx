import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { Button, Section } from '../../shared/ui/primitives.js';
import { PrimaryConversationPanel } from './PrimaryConversationPanel.js';
import { useOrganizationConsole } from './useOrganizationConsole.js';
import {
  AttentionQueue,
  OrganizationTimeline,
  OrganizationWorkItems,
  ProjectDirectory,
  ProposalAudit,
  ReportList,
} from './OrganizationCards.js';

export function OrganizationConsolePanel({ runtime }: { runtime: RuntimeInfo | null }) {
  const consoleState = useOrganizationConsole(runtime);
  /*
   * `session === null` only while the first read is in flight (or on error).
   * Rendering `0` there claims "this Runtime has no projects", which is a fact
   * we do not have yet; the counts appear a moment later and read as data loss.
   */
  const loading = consoleState.phase === 'checking' || consoleState.phase === 'loading';
  const count = (value: number) => (loading ? '—' : value);

  return (
    <Section
      className="organization-panel"
      id="organization-title"
      title="组织运行"
      description="Runtime 发布的组织事实、Attention 与审计"
      action={
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
          <Button
            size="sm"
            type="button"
            onClick={consoleState.load}
            disabled={!consoleState.supported || consoleState.busy || consoleState.refreshing}
          >
            {consoleState.refreshing ? '读取中…' : '刷新组织状态'}
          </Button>
        </div>
      }
    >
      {consoleState.phase === 'checking' && <p className="task-hint" role="status">正在检查 1.1.0 组织契约…</p>}
      {consoleState.phase === 'unsupported' && (
        <p className="task-hint">当前 Runtime 未发布 <code>organizationContract: 1.1.0</code>；组织控制台保持关闭。</p>
      )}
      {consoleState.error && <p className="task-hint" role="alert">{consoleState.error}</p>}
      {consoleState.message && <p className="task-hint" role="status">{consoleState.message}</p>}
      {consoleState.lastUpdatedAt && <p className="muted-label">最近同步：{consoleState.lastUpdatedAt}</p>}

      {consoleState.supported && <>
        <PrimaryConversationPanel
          runtime={runtime}
          intentText={consoleState.intentText}
          busy={consoleState.busy}
          onIntentTextChange={consoleState.setIntentText}
          onSubmitIntent={async () => { await consoleState.submitIntent(); }}
          onDecideAttention={consoleState.decidePublishedAttention}
        />

        <div className="organization-rail" aria-label="组织状态摘要">
          <div className="organization-summary">
            <div><strong>{count(consoleState.projects.length)}</strong><span>项目</span></div>
            <div><strong>{count(consoleState.orderedAttention.filter((item) => item.state === 'open').length)}</strong><span>待处理 Attention</span></div>
            <div><strong>{count(consoleState.proposals.length)}</strong><span>员工提案</span></div>
            <div><strong>{count(consoleState.reports.length)}</strong><span>结构化汇报</span></div>
            <div><strong>{count(consoleState.timeline.length)}</strong><span>已发布事实</span></div>
          </div>
        </div>

        <Section
          className="organization-audit-section"
          title="组织事实与审计"
          description="只读 · 由 Runtime 发布"
        />

        <div className="organization-layout">
          <OrganizationTimeline events={consoleState.timeline} hasMore={consoleState.eventHasMore} loading={loading} />
          <AttentionQueue
            records={consoleState.orderedAttention}
            selected={consoleState.selectedAttention}
            busy={consoleState.busy}
            onSelect={consoleState.selectAttention}
            onAnswer={consoleState.answerAttention}
            onWithdraw={consoleState.withdrawAttention}
          />
          <ProjectDirectory
            projects={consoleState.projects}
            selectedProjectId={consoleState.selectedProjectId}
            threads={consoleState.projectThreads}
            onSelect={consoleState.selectProject}
            loading={loading}
          />
          <ProposalAudit proposals={consoleState.proposals} delegations={consoleState.delegations} loading={loading} />
          <ReportList reports={consoleState.reports} loading={loading} />
          <OrganizationWorkItems workItems={consoleState.workItems} loading={loading} />
        </div>
      </>}

      <p className="task-note">组织状态由 Conchbase 独占发布。Pagurus 不读写私有数据库、不计算授权、不把员工提案当成可执行的 Agent revision。</p>
    </Section>
  );
}
