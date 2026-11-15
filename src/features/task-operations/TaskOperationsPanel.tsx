import { useTaskOperations } from './useTaskOperations.js';
import { Button, Field, Section, Select, Tag, Textarea } from '../../shared/ui/primitives.js';

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
    <Section
      className="task-panel"
      id="task-operations-title"
      title="运行一次任务"
      description={operations.agentMode ? '按所选 Agent 版本固定执行' : 'Runtime 兼容任务模式'}
    >

      <form className="task-form" onSubmit={(event) => {
        event.preventDefault();
        operations.startTask();
      }}>
        {operations.agentMode && <Field label="Agent" htmlFor="task-agent">
          <Select
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
          </Select>
        </Field>}

        <Field label={operations.agentMode ? '本次使用模型' : '模型'} htmlFor="task-model">
          <Select
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
          </Select>
          {operations.agentMode && <p className="task-hint">可为本次任务覆盖 Agent 默认模型；执行时会固定实际采用的模型版本。</p>}
          {operations.phase === 'models-error' && (
            <Button
              size="sm"
              type="button"
              onClick={operations.loadModels}
            >
              重新加载模型
            </Button>
          )}
        </Field>

        <Field label="任务内容" htmlFor="task-prompt">
          <Textarea
            id="task-prompt"
            value={operations.prompt}
            onChange={(event) => operations.setPrompt(event.target.value)}
            placeholder="输入希望模型完成的一轮任务"
            rows={3}
            disabled={busy}
          />
        </Field>

        <div className="task-actions">
          <Button
            variant="primary"
            type="submit"
            disabled={busy || modelsUnavailable || noUsableAgent || (operations.agentMode && !operations.selectedAgentId)}
          >
            {operations.phase === 'submitting' ? '提交中…' : '开始任务'}
          </Button>
          {operations.task && isActive(operations.task.state) && (
            <Button
              type="button"
              onClick={operations.cancel}
            >
              取消任务
            </Button>
          )}
          {operations.task && !isActive(operations.task.state) && operations.phase !== 'submitting' && (
            <Button
              type="button"
              onClick={operations.retry}
            >
              显式重试
            </Button>
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
              <span>状态：<Tag>{STATE_LABELS[operations.task.state] ?? operations.task.state}</Tag></span>
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
    </Section>
  );
}
