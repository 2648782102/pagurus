import { type RuntimeInfo } from '../../shared/api/runtime.js';
import { useAttentionWorkbench } from './useAttentionWorkbench.js';
import type { WorkItemDetail } from '../../shared/api/work.js';

export function AttentionWorkbenchPanel({ runtime }: { runtime: RuntimeInfo | null }) {
  const workbench = useAttentionWorkbench(runtime);

  return (
    <section className="work-panel" id="workbench" aria-labelledby="workbench-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">HUMAN ATTENTION</p>
          <h2 id="workbench-title">持久工作</h2>
        </div>
        <div className="history-heading-actions">
          <span className="muted-label">{workbench.workItems.length} 个工作项</span>
          <button
            className="button-secondary"
            type="button"
            onClick={workbench.load}
            disabled={workbench.phase === 'loading' || workbench.phase === 'checking'}
          >
            {workbench.phase === 'loading' ? '读取中…' : '刷新'}
          </button>
        </div>
      </div>

      {workbench.phase === 'checking' && <p className="task-hint" role="status">正在检查 durable-work-contract 能力…</p>}
      {workbench.phase === 'unsupported' && (
        <div className="work-notice" role="status">
          <p>当前 Runtime 未发布 <code>durable-work-contract</code>，工作台保持只读关闭状态。</p>
        </div>
      )}
      {workbench.phase === 'error' && (
        <div className="work-error" role="alert">
          <p>{workbench.error}</p>
          <button className="button-secondary" type="button" onClick={workbench.load}>重新加载</button>
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
                <span className="work-row-meta"><code>{item.id}</code><span>{item.mandateRevision}</span></span>
              </button>
            ))}
          </div>
          {workbench.detail && <WorkDetail detail={workbench.detail} receipts={workbench.receiptsForSelection} />}
        </div>}
      </>}

      <p className="task-note">工作台只读展示 Conchbase 发布的持久工作状态；它不创建 Trigger、执行工具或读取私有数据库。</p>
    </section>
  );
}

function WorkDetail({
  detail,
  receipts,
}: {
  detail: WorkItemDetail;
  receipts: readonly { id: string; status: string; destinationDigest: string; payloadDigest: string }[];
}) {
  return (
    <article className="work-detail" aria-labelledby="selected-work-title">
      <div className="history-detail-heading">
        <div>
          <p className="eyebrow">SELECTED WORK</p>
          <h3 id="selected-work-title">工作项详情</h3>
        </div>
        <strong>{detail.workItem.state}</strong>
      </div>
      <dl className="history-detail-grid">
        <div><dt>工作项 id</dt><dd><code>{detail.workItem.id}</code></dd></div>
        <div><dt>Thread</dt><dd><code>{detail.thread.threadKey}</code></dd></div>
        <div><dt>上下文 Trigger</dt><dd>{detail.thread.triggerIds.length} 条（仅补上下文）</dd></div>
        <div><dt>Mandate 版本</dt><dd>{detail.mandate.revision}</dd></div>
        <div><dt>授权范围</dt><dd>{detail.mandate.scope.join('、')}</dd></div>
        <div><dt>允许操作</dt><dd>{detail.mandate.allowedOperations.join('、')}</dd></div>
      </dl>

      <div className="work-section">
        <h4>执行绑定</h4>
        {detail.assignments.map((assignment) => (
          <dl className="history-detail-grid" key={assignment.id}>
            <div><dt>Assignment</dt><dd>{assignment.state}</dd></div>
            <div><dt>Model</dt><dd><code>{assignment.model.providerId}/{assignment.model.modelId}</code></dd></div>
            <div><dt>Agent 版本</dt><dd><code>{assignment.agentRevisionId}</code></dd></div>
            <div><dt>配置版本</dt><dd><code>{assignment.configurationRevisionId}</code></dd></div>
          </dl>
        ))}
      </div>

      <div className="work-section">
        <h4>Outbox 与交付证据</h4>
        {detail.outbox.map((record) => (
          <p key={record.id} className="work-evidence">
            <span>{record.status}</span><code>{record.destinationDigest}</code><code>{record.payloadDigest}</code>
          </p>
        ))}
        {receipts.map((receipt) => (
          <p key={receipt.id} className="work-evidence">
            <span>{receipt.status}</span><code>{receipt.destinationDigest}</code><code>{receipt.payloadDigest}</code>
          </p>
        ))}
        {detail.outbox.length === 0 && receipts.length === 0 && <p className="task-hint">暂无证据记录。</p>}
      </div>
    </article>
  );
}
