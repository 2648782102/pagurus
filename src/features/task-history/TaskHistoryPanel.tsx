import { useTaskHistory, type TaskHistoryFilter } from './useTaskHistory.js';
import type { Task } from '../../shared/api/tasks.js';
import { Button, EmptyState, Field, Notice, Section, Select, Tag } from '../../shared/ui/primitives.js';
import { TASK_STATE_FILTERS, TASK_STATE_LABELS } from '../../shared/ui/task-status.js';

function taskTitle(task: Task): string {
  return task.prompt.length > 72 ? `${task.prompt.slice(0, 72)}…` : task.prompt;
}

export function TaskHistoryPanel() {
  const history = useTaskHistory();

  return (
    <Section
      className="history-panel"
      id="task-history-title"
      title="任务历史"
      description={`${history.tasks.length} 条记录`}
      action={
          <Button size="sm" type="button" onClick={history.load} disabled={history.phase === 'loading'}>
            {history.phase === 'loading' ? '读取中…' : '刷新'}
          </Button>
      }
    >

      {history.phase === 'loading' && history.tasks.length === 0 && <p className="task-hint" role="status">正在读取任务历史…</p>}
      {history.phase === 'error' && (
        <Notice tone="danger" action={<Button size="sm" type="button" onClick={history.load}>重新加载</Button>}>
          {history.error}
        </Notice>
      )}

      {history.phase !== 'error' && <>
        <div className="history-filters" aria-label="任务筛选">
          <Field label="状态" htmlFor="history-state-filter">
          <Select
            id="history-state-filter"
            value={history.stateFilter}
            onChange={(event) => history.setStateFilter(event.target.value as TaskHistoryFilter)}
          >
            <option value="all">全部状态</option>
            {TASK_STATE_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
          </Select>
          </Field>
          <Field label="Agent" htmlFor="history-agent-filter">
          <Select
            id="history-agent-filter"
            value={history.agentFilter}
            onChange={(event) => history.setAgentFilter(event.target.value)}
          >
            <option value="all">全部 Agent</option>
            <option value="legacy">旧 Runtime 任务</option>
            {history.agentIds.map((agentId) => <option key={agentId} value={agentId}>{agentId}</option>)}
          </Select>
          </Field>
        </div>

        {history.visibleTasks.length === 0 && (
          <EmptyState
            tone="compact"
            title="当前筛选条件下没有任务记录。"
            description="调整状态或 Agent 筛选后可以重新查看历史任务。"
          />
        )}
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
                  <span>{TASK_STATE_LABELS[task.state]}</span>
                  <code>{task.id}</code>
                </span>
              </button>
            ))}
          </div>
          {history.selectedTask && <TaskHistoryDetail task={history.selectedTask} />}
        </div>}
      </>}
      {history.activeConfigurationRevisionId && <p className="task-note">当前 Runtime 配置版本：<code>{history.activeConfigurationRevisionId}</code>。历史任务仍显示创建时固定的配置版本。</p>}
    </Section>
  );
}

function TaskHistoryDetail({ task }: { task: Task }) {
  return (
    <article className="history-detail" aria-labelledby="selected-task-title">
      <div className="history-detail-heading">
        <div>
          <p className="eyebrow">已选任务</p>
          <h3 id="selected-task-title">任务详情</h3>
        </div>
        <Tag tone={task.state === 'failed' ? 'danger' : task.state === 'succeeded' ? 'success' : 'neutral'}>
          {TASK_STATE_LABELS[task.state]}
        </Tag>
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
