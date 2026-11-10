import { useTaskHistory, type TaskHistoryFilter } from './useTaskHistory.js';
import type { Task } from '../../shared/api/tasks.js';

const STATE_LABELS: Record<string, string> = {
  queued: '排队中',
  running: '模型运行中',
  cancelling: '正在取消',
  succeeded: '已完成',
  failed: '失败',
  cancelled: '已取消',
  interrupted: '进程中断',
  waiting_approval: '等待审批',
};

const STATE_FILTERS: readonly { value: TaskHistoryFilter; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'queued', label: '排队中' },
  { value: 'running', label: '模型运行中' },
  { value: 'cancelling', label: '正在取消' },
  { value: 'succeeded', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'cancelled', label: '已取消' },
  { value: 'interrupted', label: '进程中断' },
  { value: 'waiting_approval', label: '等待审批' },
];

function taskTitle(task: Task): string {
  return task.prompt.length > 72 ? `${task.prompt.slice(0, 72)}…` : task.prompt;
}

export function TaskHistoryPanel() {
  const history = useTaskHistory();

  return (
    <section className="history-panel" id="task-history" aria-labelledby="task-history-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">TASK HISTORY</p>
          <h2 id="task-history-title">任务历史</h2>
        </div>
        <div className="history-heading-actions">
          <span className="muted-label">{history.tasks.length} 条记录</span>
          <button className="button-secondary" type="button" onClick={history.load} disabled={history.phase === 'loading'}>
            {history.phase === 'loading' ? '读取中…' : '刷新'}
          </button>
        </div>
      </div>

      {history.phase === 'loading' && history.tasks.length === 0 && <p className="task-hint" role="status">正在读取任务历史…</p>}
      {history.phase === 'error' && (
        <div className="history-notice" role="alert">
          <p>{history.error}</p>
          <button className="button-secondary" type="button" onClick={history.load}>重新加载</button>
        </div>
      )}

      {history.phase !== 'error' && <>
        <div className="history-filters" aria-label="任务筛选">
          <label htmlFor="history-state-filter">状态</label>
          <select
            id="history-state-filter"
            value={history.stateFilter}
            onChange={(event) => history.setStateFilter(event.target.value as TaskHistoryFilter)}
          >
            {STATE_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
          </select>
          <label htmlFor="history-agent-filter">Agent</label>
          <select
            id="history-agent-filter"
            value={history.agentFilter}
            onChange={(event) => history.setAgentFilter(event.target.value)}
          >
            <option value="all">全部 Agent</option>
            <option value="legacy">旧 Runtime 任务</option>
            {history.agentIds.map((agentId) => <option key={agentId} value={agentId}>{agentId}</option>)}
          </select>
        </div>

        {history.visibleTasks.length === 0 && <p className="task-hint">当前筛选条件下没有任务记录。</p>}
        {history.visibleTasks.length > 0 && <div className="history-layout">
          <div className="history-list" role="listbox" aria-label="任务记录">
            {history.visibleTasks.map((task) => (
              <button
                className={`history-row${task.id === history.selectedTaskId ? ' is-selected' : ''}`}
                key={task.id}
                type="button"
                role="option"
                aria-selected={task.id === history.selectedTaskId}
                onClick={() => history.setSelectedTaskId(task.id)}
              >
                <span className="history-row-title">{taskTitle(task)}</span>
                <span className="history-row-meta">
                  <span>{STATE_LABELS[task.state] ?? task.state}</span>
                  <code>{task.id}</code>
                </span>
              </button>
            ))}
          </div>
          {history.selectedTask && <TaskHistoryDetail task={history.selectedTask} />}
        </div>}
      </>}
      {history.activeConfigurationRevisionId && <p className="task-note">当前 Runtime 配置版本：<code>{history.activeConfigurationRevisionId}</code>。历史任务仍显示创建时固定的配置版本。</p>}
    </section>
  );
}

function TaskHistoryDetail({ task }: { task: Task }) {
  return (
    <article className="history-detail" aria-labelledby="selected-task-title">
      <div className="history-detail-heading">
        <div>
          <p className="eyebrow">SELECTED TASK</p>
          <h3 id="selected-task-title">任务详情</h3>
        </div>
        <strong>{STATE_LABELS[task.state] ?? task.state}</strong>
      </div>
      <dl className="history-detail-grid">
        <div><dt>任务 id</dt><dd><code>{task.id}</code></dd></div>
        <div><dt>Attempt</dt><dd>{task.attempt}</dd></div>
        <div><dt>Agent</dt><dd>{task.agentId ? <code>{task.agentId}</code> : '旧 Runtime 任务'}</dd></div>
        <div><dt>Agent 版本</dt><dd><code>{task.agentRevisionId ?? '—'}</code></dd></div>
        <div><dt>Runtime 配置版本</dt><dd><code>{task.configurationRevisionId}</code></dd></div>
        <div><dt>生效模型</dt><dd><code>{task.providerId && task.modelId ? `${task.providerId} / ${task.modelId}` : task.model}</code></dd></div>
      </dl>
      <p className="history-prompt">{task.prompt}</p>
      {task.error && <p className="error-message">{task.error}</p>}
      {task.output && <pre className="task-output">{task.output}</pre>}
      {!task.output && task.partialOutput && <pre className="task-output">{task.partialOutput}</pre>}
    </article>
  );
}
