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

export function TaskOperationsPanel({ agentRefreshToken = 0 }: { agentRefreshToken?: number }) {
  const operations = useTaskOperations(agentRefreshToken);
  const busy = operations.phase === 'submitting' || operations.phase === 'active';
  const modelsUnavailable = operations.phase === 'loading-models'
    || operations.phase === 'models-error'
    || operations.models.length === 0;
  const noUsableAgent = operations.agentMode && !operations.agents.some((agent) => !agent.archived);

  return (
    <section className="task-panel" aria-labelledby="task-operations-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PHASE 1 · TASK OPS</p>
          <h2 id="task-operations-title">运行一次任务</h2>
        </div>
        <span className="muted-label">{operations.agentMode ? '按所选 Agent 版本固定执行' : 'Runtime 兼容任务模式'}</span>
      </div>

      <form className="task-form" onSubmit={(event) => {
        event.preventDefault();
        operations.startTask();
      }}>
        {operations.agentMode && <div className="task-field">
          <label htmlFor="task-agent">Agent</label>
          <select
            id="task-agent"
            value={operations.selectedAgentId}
            onChange={(event) => operations.setSelectedAgentId(event.target.value)}
            disabled={busy || operations.agents.every((agent) => agent.archived)}
          >
            {!operations.selectedAgentId && <option value="">请选择 Agent</option>}
            {operations.agents.filter((agent) => !agent.archived).map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.current.name}{agent.isDefault ? ' · 默认' : ''}</option>
            ))}
            {operations.agents.every((agent) => agent.archived) && <option value="">暂无可用 Agent</option>}
          </select>
        </div>}

        <div className="task-field">
          <label htmlFor="task-model">{operations.agentMode ? '本次使用模型' : '模型'}</label>
          <select
            id="task-model"
            value={operations.selectedModel}
            onChange={(event) => operations.setSelectedModel(event.target.value)}
            disabled={busy || modelsUnavailable || noUsableAgent || (operations.agentMode && !operations.selectedAgentId)}
          >
            {operations.models.length === 0 && <option value="">暂无可用模型</option>}
            {operations.models.map((model) => (
              <option key={model.reference} value={model.reference}>
                {model.displayName} · {operations.agentMode ? `${model.providerId} / ` : ''}{model.modelId}
              </option>
            ))}
          </select>
          {operations.agentMode && <p className="task-hint">可为本次任务覆盖 Agent 默认模型；执行时会固定实际采用的模型版本。</p>}
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
            disabled={busy || modelsUnavailable || noUsableAgent || (operations.agentMode && !operations.selectedAgentId)}
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
        {operations.phase === 'loading-models' && <p className="task-hint">正在读取 Runtime 模型目录…</p>}
        {operations.phase === 'models-error' && <p className="task-hint">请确认 Conchbase 已启动，并检查当前 provider 的模型目录。</p>}
        {operations.phase === 'ready' && operations.models.length === 0 && (
          <p className="task-hint">Runtime 当前没有可用模型。</p>
        )}
        {operations.agentMode && operations.agents.length === 0 && operations.phase === 'ready' && (
          <p className="task-hint">还没有可运行的 Agent。先在上方 Agent 配置区创建一个。</p>
        )}
        {operations.task && (
          <div className="task-record">
            <div className="task-meta">
              <span>状态：<strong>{STATE_LABELS[operations.task.state] ?? operations.task.state}</strong></span>
              <span>Attempt {operations.task.attempt}</span>
              <code>{operations.task.id}</code>
            </div>
            {operations.task.agentId && <dl className="task-binding">
              <div><dt>Agent</dt><dd>{operations.taskAgentName ?? '所选 Agent'} · <code>{operations.task.agentId}</code></dd></div>
              <div><dt>固定 Agent 版本</dt><dd><code>{operations.task.agentRevisionId ?? '—'}</code></dd></div>
              <div><dt>Runtime 配置版本</dt><dd><code>{operations.task.configurationRevisionId}</code></dd></div>
              <div><dt>生效模型</dt><dd><code>{operations.task.providerId ?? '—'} / {operations.task.modelId ?? operations.task.model}</code></dd></div>
            </dl>}
            {(() => {
              const finalOutput = !isActive(operations.task?.state)
                ? operations.task?.output
                : null;
              const visibleOutput = finalOutput
                ?? (isActive(operations.task?.state) ? operations.task?.partialOutput : null);
              if (!visibleOutput) return null;
              return (
                <div className="task-output-block">
                  {!finalOutput && <p className="task-progress-label">实时输出中…</p>}
                  <pre className="task-output">{visibleOutput}</pre>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      <p className="task-note">Agent 任务固定所选 Agent 版本与 Runtime 配置版本；旧 Runtime 继续使用兼容任务模式。模型调用和权限仍由 Conchbase 管理。</p>
    </section>
  );
}
