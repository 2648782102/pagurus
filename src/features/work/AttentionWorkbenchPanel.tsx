import { type RuntimeInfo } from '../../shared/api/runtime.js';
import type { WorkEvent } from '../../shared/api/work.js';
import { useAttentionWorkbench } from './useAttentionWorkbench.js';
import type { WorkDeliveryReceipt, WorkItemDetail } from '../../shared/api/work.js';

export function AttentionWorkbenchPanel({ runtime }: { runtime: RuntimeInfo | null }) {
  const workbench = useAttentionWorkbench(runtime);
  const busy = workbench.actionLabel !== null;

  return (
    <section className="work-panel" id="workbench" aria-labelledby="workbench-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CONTROL WORKBENCH</p>
          <h2 id="workbench-title">持久工作控制台</h2>
        </div>
        <div className="history-heading-actions">
          <span className="muted-label">{workbench.workItems.length} 个工作项</span>
          <button
            className="button-secondary"
            type="button"
            onClick={workbench.load}
            disabled={workbench.phase === 'loading' || workbench.phase === 'checking' || busy}
          >
            {workbench.phase === 'loading' ? '读取中…' : '刷新'}
          </button>
        </div>
      </div>

      {workbench.phase === 'checking' && <p className="task-hint" role="status">正在检查 durable-work-contract 能力…</p>}
      {workbench.phase === 'unsupported' && (
        <div className="work-notice" role="status">
          <p>当前 Runtime 未发布 <code>durable-work-contract</code>，控制台保持关闭状态。</p>
        </div>
      )}
      {workbench.phase === 'error' && (
        <div className="work-error" role="alert">
          <p>{workbench.error}</p>
          <button className="button-secondary" type="button" onClick={workbench.load}>重新加载</button>
        </div>
      )}
      {workbench.actionMessage && <p className="task-hint" role="status">{workbench.actionMessage}</p>}
      {(workbench.phase === 'ready' || workbench.phase === 'loading')
        && (!workbench.supportsControls || !workbench.supportsSourcePolicy) && (
        <div className="work-notice" role="status">
          <p>当前 Runtime 缺少 <code>asynchronous-work-control</code> 或 <code>local-source-policy</code>，相应控制已禁用。</p>
        </div>
      )}

      {(workbench.phase === 'ready' || workbench.phase === 'loading') && <>
        {workbench.workItems.length === 0 && <p className="task-hint">Runtime 暂无持久工作项。</p>}
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
            workbench={workbench}
          />}
        </div>}
      </>}

      <p className="task-note">控制台只通过已发布的 Runtime API 提交显式控制请求；Conchbase 持有工作身份与状态，Pagurus 不读取私有数据库。</p>
    </section>
  );
}

type WorkbenchController = ReturnType<typeof useAttentionWorkbench>;

function WorkDetail({
  detail,
  receipts,
  events,
  busy,
  actionLabel,
  workbench,
}: {
  detail: WorkItemDetail;
  receipts: readonly WorkDeliveryReceipt[];
  events: readonly WorkEvent[];
  busy: boolean;
  actionLabel: string | null;
  workbench: WorkbenchController;
}) {
  const workItemId = detail.workItem.id;
  const state = detail.workItem.state;
  const assignment = detail.assignments[0];
  const controlsUnavailable = !workbench.supportsControls;

  return (
    <article className="work-detail" aria-labelledby="selected-work-title">
      <div className="history-detail-heading">
        <div>
          <p className="eyebrow">SELECTED WORK · v{detail.version}</p>
          <h3 id="selected-work-title">工作项详情</h3>
        </div>
        <strong>{state}</strong>
      </div>

      <div className="task-actions" aria-label="工作项控制">
        <button className="button-primary" type="button"
          disabled={busy || controlsUnavailable || !['open', 'paused'].includes(state)}
          onClick={() => workbench.start(workItemId, state)}>
          {actionLabel === 'start' ? '启动中…' : '启动 / 恢复'}
        </button>
        <button className="button-secondary" type="button"
          disabled={busy || controlsUnavailable || !['running', 'paused'].includes(state)}
          onClick={() => workbench.stop(workItemId, state)}>
          {actionLabel === 'stop' ? '停止中…' : '停止'}
        </button>
        <button className="button-secondary" type="button"
          disabled={busy || controlsUnavailable || state !== 'running'}
          onClick={() => workbench.complete(workItemId, state)}>
          {actionLabel === 'complete' ? '完成中…' : '标记完成'}
        </button>
        <button className="button-secondary" type="button" disabled={busy || !workbench.supportsSourcePolicy}
          onClick={() => workbench.source(detail.thread.threadKey, 'allow')}>允许本地事件</button>
        <button className="button-secondary" type="button" disabled={busy || !workbench.supportsSourcePolicy}
          onClick={() => workbench.source(detail.thread.threadKey, 'deny')}>拒绝本地事件</button>
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
          <button className="button-secondary" type="button" disabled={busy || controlsUnavailable}
            onClick={() => workbench.reconcile(assignment.id, 'succeeded')}>恢复为成功</button>
          <button className="button-secondary" type="button" disabled={busy || controlsUnavailable}
            onClick={() => workbench.reconcile(assignment.id, 'failed')}>恢复为失败</button>
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
              <button className="button-secondary" type="button" disabled={busy}
                onClick={() => workbench.decide(receipt.id, 'accepted')}>接受</button>
              <button className="button-secondary" type="button" disabled={busy}
                onClick={() => workbench.decide(receipt.id, 'rejected')}>拒绝</button>
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
