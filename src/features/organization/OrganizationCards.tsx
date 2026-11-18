import type {
  OrganizationAttentionRecord,
  OrganizationAgentProposalList,
  OrganizationDelegationRecord,
  OrganizationEventRecord,
  OrganizationProjectThreadList,
  OrganizationReportRecord,
  OrganizationWorkItemRecord,
} from '../../shared/api/organization.js';
import { Button, Tag } from '../../shared/ui/primitives.js';
import { eventLabel, projectStateLabel } from './organization-labels.js';

export function OrganizationTimeline({
  events,
  hasMore,
  loading,
}: {
  readonly events: readonly OrganizationEventRecord[];
  readonly hasMore: boolean;
  readonly loading: boolean;
}) {
  return (
    <article className="organization-card organization-card-timeline" aria-labelledby="organization-timeline-title">
      <div className="section-heading">
        <h3 id="organization-timeline-title">主会话时间线</h3>
        <span className="muted-label">{loading ? '读取中' : hasMore ? '可继续分页' : '已到最新'}</span>
      </div>
      {/*
       * An empty list has two very different meanings: Runtime published
       * nothing, or this view has not read it yet. Saying "尚未发布" while the
       * first read is still in flight reports a fact we do not have, and the
       * operator has no way to tell the two apart.
       */}
      {loading && events.length === 0 && <p className="task-hint" role="status">正在读取组织事件…</p>}
      {!loading && events.length === 0 && <p className="task-hint">Runtime 尚未发布组织事件。</p>}
      <ol className="organization-timeline">
        {events.map((event) => (
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
  );
}

export function AttentionQueue({
  records,
  selected,
  busy,
  onSelect,
  onAnswer,
  onWithdraw,
}: {
  readonly records: readonly OrganizationAttentionRecord[];
  readonly selected: OrganizationAttentionRecord | undefined;
  readonly busy: boolean;
  readonly onSelect: (id: string) => void;
  readonly onAnswer: (record: OrganizationAttentionRecord) => void;
  readonly onWithdraw: (record: OrganizationAttentionRecord) => void;
}) {
  return (
    <article className="organization-card" aria-labelledby="organization-attention-title">
      <h3 id="organization-attention-title">Attention 优先队列</h3>
      {records.length === 0 && <p className="task-hint">当前没有 AttentionRequest。</p>}
      {records.map((attention) => (
        <div className="organization-attention-row" key={attention.id}>
          <button type="button" onClick={() => onSelect(attention.id)}>
            <strong>{attention.state === 'open' ? '待处理' : attention.state}</strong>
            <code>{attention.id}</code>
          </button>
          {attention.id === selected?.id && attention.state === 'open' && <>
            <Button size="sm" variant="primary" type="button" disabled={busy}
              onClick={() => onAnswer(attention)}>回答</Button>
            <Button size="sm" type="button" disabled={busy}
              onClick={() => onWithdraw(attention)}>撤回</Button>
          </>}
        </div>
      ))}
      {selected && <dl className="history-detail-grid">
        <div><dt>questionDigest</dt><dd><code>{selected.questionDigest}</code></dd></div>
        <div><dt>expectedVersion</dt><dd>{selected.expectedVersion}</dd></div>
        <div><dt>项目</dt><dd><code>{selected.projectId}</code></dd></div>
        <div><dt>员工</dt><dd><code>{selected.workerId}</code></dd></div>
      </dl>}
    </article>
  );
}

export function ProjectDirectory({
  projects,
  selectedProjectId,
  threads,
  onSelect,
  loading,
}: {
  readonly projects: readonly { readonly id: string; readonly state: string }[];
  readonly selectedProjectId: string;
  readonly threads: OrganizationProjectThreadList | null;
  readonly onSelect: (id: string) => void;
  readonly loading: boolean;
}) {
  return (
    <article className="organization-card organization-card-projects" aria-labelledby="organization-project-title">
      <h3 id="organization-project-title">项目与归档</h3>
      {loading && projects.length === 0 && <p className="task-hint" role="status">正在读取项目…</p>}
      {!loading && projects.length === 0 && <p className="task-hint">Runtime 尚未发布项目。</p>}
      <div className="organization-project-list">
        {projects.map((project) => (
          <button
            className={`organization-project-row${project.id === selectedProjectId ? ' is-selected' : ''}`}
            key={project.id}
            type="button"
            onClick={() => onSelect(project.id)}
          >
            <strong>{projectStateLabel(project.state)}</strong>
            <code>{project.id}</code>
          </button>
        ))}
      </div>
      {threads && <div className="organization-threads">
        <h4>项目线程事实</h4>
        {threads.threads.length === 0 && <p className="task-hint">暂无项目线程事实。</p>}
        {threads.threads.slice(-12).reverse().map((thread) => (
          <p className="organization-fact" key={thread.eventId}>
            <span>#{thread.sequence}</span><code>{thread.type}</code>
          </p>
        ))}
      </div>}
    </article>
  );
}

export function ProposalAudit({
  proposals,
  delegations,
  loading,
}: {
  readonly proposals: OrganizationAgentProposalList['proposals'];
  readonly delegations: readonly OrganizationDelegationRecord[];
  readonly loading: boolean;
}) {
  return (
    <article className="organization-card" aria-labelledby="organization-proposal-title">
      <h3 id="organization-proposal-title">动态提案与委派审计</h3>
      {loading && proposals.length === 0 && <p className="task-hint" role="status">正在读取员工提案…</p>}
      {!loading && proposals.length === 0 && <p className="task-hint">Runtime 尚未发布员工提案。</p>}
      {proposals.map((proposal) => (
        <p className="organization-fact" key={proposal.workerId}>
          <code>{proposal.workerId}</code><Tag>{proposal.state}</Tag>
          <code>{proposal.instructionsDigest}</code>
        </p>
      ))}
      {delegations.map((delegation) => (
        <p className="organization-fact" key={delegation.id}>
          <code>{delegation.id}</code><Tag>{delegation.state}</Tag>
          <small>depth {delegation.maxDelegationDepth} · ttl #{delegation.expiresAtSequence}</small>
        </p>
      ))}
    </article>
  );
}

export function ReportList({ reports, loading }: {
  readonly reports: readonly OrganizationReportRecord[];
  readonly loading: boolean;
}) {
  return (
    <article className="organization-card" aria-labelledby="organization-report-title">
      <h3 id="organization-report-title">结构化汇报</h3>
      {loading && reports.length === 0 && <p className="task-hint" role="status">正在读取结构化汇报…</p>}
      {!loading && reports.length === 0 && <p className="task-hint">Runtime 尚未发布报告。</p>}
      {[...reports].reverse().map((report) => (
        <p className="organization-fact" key={report.id}>
          <span>#{report.sequence}</span>
          <Tag tone={report.state === 'failed' ? 'danger' : 'neutral'}>{report.state}</Tag>
          <code>{report.summaryDigest}</code>
        </p>
      ))}
    </article>
  );
}

export function OrganizationWorkItems({
  workItems,
  loading,
}: {
  readonly workItems: readonly OrganizationWorkItemRecord[];
  readonly loading: boolean;
}) {
  return (
    <article className="organization-card" aria-labelledby="organization-work-title">
      <h3 id="organization-work-title">组织工作项</h3>
      {loading && workItems.length === 0 && <p className="task-hint" role="status">正在读取工作项…</p>}
      {!loading && workItems.length === 0 && <p className="task-hint">Runtime 尚未发布工作项视图。</p>}
      {workItems.map((workItem) => (
        <p className="organization-fact" key={workItem.workItemId}>
          <code>{workItem.workItemId}</code><Tag>{workItem.state}</Tag>
          <small>{workItem.workerId}</small>
        </p>
      ))}
    </article>
  );
}
