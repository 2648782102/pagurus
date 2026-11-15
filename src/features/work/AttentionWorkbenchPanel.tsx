import { type RuntimeInfo } from '../../shared/api/runtime.js';
import type { WorkEvent } from '../../shared/api/work.js';
import { useAttentionWorkbench } from './useAttentionWorkbench.js';
import type { WorkDeliveryReceipt, WorkItemDetail } from '../../shared/api/work.js';
import { Button, EmptyState, Notice, Section, Tag } from '../../shared/ui/primitives.js';

export function AttentionWorkbenchPanel({ runtime }: { runtime: RuntimeInfo | null }) {
  const workbench = useAttentionWorkbench(runtime);
  const busy = workbench.actionLabel !== null;

  return (
    <Section
      className="work-panel"
      id="workbench-title"
      title="持久工作控制台"
      description={`${workbench.workItems.length} 个工作项`}
      action={
          <Button
            size="sm"
            type="button"
            onClick={workbench.load}
            disabled={workbench.phase === 'loading' || workbench.phase === 'checking' || busy}
          >
            {workbench.phase === 'loading' ? '读取中…' : '刷新'}
          </Button>
      }
    >

      {workbench.phase === 'checking' && <p className="task-hint" role="status">正在检查 durable-work-contract 能力…</p>}
      {workbench.phase === 'unsupported' && (
        <Notice>当前 Runtime 未发布 <code>durable-work-contract</code>，控制台保持关闭状态。</Notice>
      )}
      {workbench.phase === 'error' && (
        <Notice tone="danger" action={<Button size="sm" type="button" onClick={workbench.load}>重新加载</Button>}>
          {workbench.error}
        </Notice>
      )}
      {workbench.actionMessage && <p className="task-hint" role="status">{workbench.actionMessage}</p>}
      {(workbench.phase === 'ready' || workbench.phase === 'loading')
        && (!workbench.supportsControls || !workbench.supportsSourcePolicy) && (
        <Notice tone="warning">
          当前 Runtime 缺少 <code>asynchronous-work-control</code> 或 <code>local-source-policy</code>，相应控制已禁用。
        </Notice>
      )}

      {(workbench.phase === 'ready' || workbench.phase === 'loading') && <>
        {workbench.workItems.length === 0 && (
          <EmptyState
            tone="compact"
            title="Runtime 暂无持久工作项。"
            description="当 Runtime 发布一个 WorkItem 后，这里会出现完整的工作项、交付证据与控制入口。"
          />
        )}
        {workbench.workItems.length > 0 && <div className="work-layout">
          <div className="work-list" role="listbox" aria-label="持久工作项">
            {workbench.workItems.map((item) => (
              <button
                className={`work-row${item.id === workbench.selectedWorkItemId ? ' is-selected' : ''}`}
                key={item.id}
                type="button"
                role="option"
                aria-selected={item.id === workbench.selectedWorkItemId}
                onClick={() => workbench.select(item.id)}
              >
                <span className="work-row-title">{item.state}</span>
                <span className="work-row-meta"><code>{item.id}</code><span>v{item.version}</span></span>
              </button>
            ))}
          </div>
          {workbench.detail && <WorkDetail
            detail={workbench.detail}
            receipts={workbench.receiptsForSelection}
            events={workbench.eventsForSelection}
            busy={busy}
            actionLabel={workbench.actionLabel}
            supportsControls={workbench.supportsControls}
            supportsSourcePolicy={workbench.supportsSourcePolicy}
            actions={{
              start: workbench.start,
              stop: workbench.stop,
              complete: workbench.complete,
              reconcile: workbench.reconcile,
              decide: workbench.decide,
              source: workbench.source,
            }}
          />}
        </div>}
      </>}

      <p className="task-note">控制台只通过已发布的 Runtime API 提交显式控制请求；Conchbase 持有工作身份与状态，Pagurus 不读取私有数据库。</p>
    </Section>
  );
}

interface WorkDetailActions {
  readonly start: (workItemId: string, expectedState: WorkItemDetail['workItem']['state']) => void;
  readonly stop: (workItemId: string, expectedState: WorkItemDetail['workItem']['state']) => void;
  readonly complete: (workItemId: string, expectedState: WorkItemDetail['workItem']['state']) => void;
  readonly reconcile: (assignmentId: string, outcome: 'succeeded' | 'failed') => void;
  readonly decide: (receiptId: string, decision: 'accepted' | 'rejected') => void;
  readonly source: (threadKey: string, policy: 'allow' | 'deny') => void;
}

function WorkDetail({
  detail,
  receipts,
  events,
  busy,
  actionLabel,
  supportsControls,
  supportsSourcePolicy,
  actions,
}: {
  detail: WorkItemDetail;
  receipts: readonly WorkDeliveryReceipt[];
  events: readonly WorkEvent[];
  busy: boolean;
  actionLabel: string | null;
  supportsControls: boolean;
  supportsSourcePolicy: boolean;
  actions: WorkDetailActions;
}) {
  const workItemId = detail.workItem.id;
  const state = detail.workItem.state;
  const assignment = detail.assignments[0];
  const controlsUnavailable = !supportsControls;

  return (
    <article className="work-detail" aria-labelledby="selected-work-title">
      <div className="history-detail-heading">
        <div>
          <p className="eyebrow">SELECTED WORK · v{detail.version}</p>
          <h3 id="selected-work-title">工作项详情</h3>
        </div>
        <Tag>{state}</Tag>
      </div>

      <div className="task-actions" aria-label="工作项控制">
        <Button variant="primary" type="button"
          disabled={busy || controlsUnavailable || !['open', 'paused'].includes(state)}
          onClick={() => actions.start(workItemId, state)}>
          {actionLabel === 'start' ? '启动中…' : '启动 / 恢复'}
        </Button>
        <Button type="button"
          disabled={busy || controlsUnavailable || !['running', 'paused'].includes(state)}
          onClick={() => actions.stop(workItemId, state)}>
          {actionLabel === 'stop' ? '停止中…' : '停止'}
        </Button>
        <Button type="button"
          disabled={busy || controlsUnavailable || state !== 'running'}
          onClick={() => actions.complete(workItemId, state)}>
          {actionLabel === 'complete' ? '完成中…' : '标记完成'}
        </Button>
        <Button type="button" disabled={busy || !supportsSourcePolicy}
          onClick={() => actions.source(detail.thread.threadKey, 'allow')}>允许本地事件</Button>
        <Button type="button" disabled={busy || !supportsSourcePolicy}
          onClick={() => actions.source(detail.thread.threadKey, 'deny')}>拒绝本地事件</Button>
      </div>

      <dl className="history-detail-grid">
        <div><dt>工作项 id</dt><dd><code>{workItemId}</code></dd></div>
        <div><dt>Thread</dt><dd><code>{detail.thread.threadKey}</code></dd></div>
        <div><dt>上下文 Trigger</dt><dd>{detail.thread.triggerIds.length} 条（仅补上下文）</dd></div>
        <div><dt>Mandate 版本</dt><dd>{detail.mandate.revision}</dd></div>
        <div><dt>授权范围</dt><dd>{detail.mandate.scope.join('、')}</dd></div>
        <div><dt>允许操作</dt><dd>{detail.mandate.allowedOperations.join('、')}</dd></div>
      </dl>

      <div className="work-section">
        <h4>执行绑定与恢复</h4>
        {detail.assignments.map((item) => (
          <dl className="history-detail-grid" key={item.id}>
            <div><dt>Assignment</dt><dd>{item.state}</dd></div>
            <div><dt>Model</dt><dd><code>{item.model.providerId}/{item.model.modelId}</code></dd></div>
            <div><dt>Agent 版本</dt><dd><code>{item.agentRevisionId}</code></dd></div>
            <div><dt>配置版本</dt><dd><code>{item.configurationRevisionId}</code></dd></div>
          </dl>
        ))}
        {assignment?.state === 'interrupted' && <div className="task-actions">
          <Button type="button" disabled={busy || controlsUnavailable}
            onClick={() => actions.reconcile(assignment.id, 'succeeded')}>恢复为成功</Button>
          <Button type="button" disabled={busy || controlsUnavailable}
            onClick={() => actions.reconcile(assignment.id, 'failed')}>恢复为失败</Button>
        </div>}
      </div>

      <div className="work-section">
        <h4>Outbox 与交付决策</h4>
        {detail.outbox.map((record) => (
          <p key={record.id} className="work-evidence">
            <span>{record.status}</span><code>{record.destinationDigest}</code><code>{record.payloadDigest}</code>
          </p>
        ))}
        {receipts.map((receipt) => (
          <p key={receipt.id} className="work-evidence">
            <span>{receipt.status}</span><code>{receipt.destinationDigest}</code><code>{receipt.payloadDigest}</code>
            {receipt.status === 'observed' && <>
              <Button size="sm" type="button" disabled={busy}
                onClick={() => actions.decide(receipt.id, 'accepted')}>接受</Button>
              <Button size="sm" type="button" disabled={busy}
                onClick={() => actions.decide(receipt.id, 'rejected')}>拒绝</Button>
            </>}
          </p>
        ))}
        {detail.outbox.length === 0 && receipts.length === 0 && <p className="task-hint">暂无证据记录。</p>}
      </div>

      <div className="work-section">
        <h4>证据事件</h4>
        {events.length === 0 && <p className="task-hint">暂无事件。</p>}
        {events.slice(-8).map((event) => (
          <p key={event.id} className="work-evidence">
            <span>{event.sequence}</span><code>{event.type}</code><code>{JSON.stringify(event.data)}</code>
          </p>
        ))}
      </div>
    </article>
  );
}
