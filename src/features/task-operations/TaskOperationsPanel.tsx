import { useTaskOperations } from './useTaskOperations.js';

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

function isActive(state: string | undefined): boolean {
  return ['queued', 'running', 'cancelling'].includes(state ?? '');
}

export function TaskOperationsPanel() {
  const operations = useTaskOperations();
  const busy = operations.phase === 'submitting' || operations.phase === 'active';
  const modelsUnavailable = operations.phase === 'loading-models'
    || operations.phase === 'models-error'
    || operations.models.length === 0;

  return (
    <section className="task-panel" aria-labelledby="task-operations-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PHASE 1 · TASK OPS</p>
          <h2 id="task-operations-title">运行一次任务</h2>
        </div>
        <span className="muted-label">通过本机 Magpie 模型</span>
      </div>

      <form className="task-form" onSubmit={(event) => {
        event.preventDefault();
        operations.startTask();
      }}>
        <div className="task-field">
          <label htmlFor="task-model">模型</label>
          <select
            id="task-model"
            value={operations.selectedModel}
            onChange={(event) => operations.setSelectedModel(event.target.value)}
            disabled={busy || modelsUnavailable}
          >
            {operations.models.length === 0 && <option value="">暂无可用模型</option>}
            {operations.models.map((model) => (
              <option key={model.id} value={model.id}>{model.displayName} · {model.id}</option>
            ))}
          </select>
          {operations.phase === 'models-error' && (
            <button
              className="button-secondary inline-retry"
              type="button"
              onClick={operations.loadModels}
            >
              重新加载模型
            </button>
          )}
        </div>

        <div className="task-field">
          <label htmlFor="task-prompt">任务内容</label>
          <textarea
            id="task-prompt"
            value={operations.prompt}
            onChange={(event) => operations.setPrompt(event.target.value)}
            placeholder="输入希望模型完成的一轮任务"
            rows={3}
            disabled={busy}
          />
        </div>

        <div className="task-actions">
          <button
            className="button-primary"
            type="submit"
            disabled={busy || modelsUnavailable}
          >
            {operations.phase === 'submitting' ? '提交中…' : '开始任务'}
          </button>
          {operations.task && isActive(operations.task.state) && (
            <button
              className="button-secondary"
              type="button"
              onClick={operations.cancel}
            >
              取消任务
            </button>
          )}
          {operations.task && !isActive(operations.task.state) && operations.phase !== 'submitting' && (
            <button
              className="button-secondary"
              type="button"
              onClick={operations.retry}
            >
              显式重试
            </button>
          )}
        </div>
      </form>

      <div className="task-result" aria-live="polite" aria-busy={busy}>
        {operations.error && <p className="error-message" role="alert">{operations.error}</p>}
        {operations.phase === 'loading-models' && <p className="task-hint">正在读取 Magpie 模型目录…</p>}
        {operations.phase === 'models-error' && <p className="task-hint">请确认 Conchbase 与 Magpie 已启动。</p>}
        {operations.phase === 'ready' && operations.models.length === 0 && (
          <p className="task-hint">模型目录为空，请先在 Magpie 启用模型。</p>
        )}
        {operations.task && (
          <div className="task-record">
            <div className="task-meta">
              <span>状态：<strong>{STATE_LABELS[operations.task.state] ?? operations.task.state}</strong></span>
              <span>Attempt {operations.task.attempt}</span>
              <code>{operations.task.id}</code>
            </div>
            {operations.task.output && <pre className="task-output">{operations.task.output}</pre>}
          </div>
        )}
      </div>
      <p className="task-note">配置 Agents、MCP、Skills 和插件的界面仍在规划中；这里只操作运行时任务。</p>
    </section>
  );
}
