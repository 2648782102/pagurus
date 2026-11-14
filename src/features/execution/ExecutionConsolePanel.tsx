import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { useExecutionConsole } from './useExecutionConsole.js';

const STATE_LABELS: Readonly<Record<string, string>> = {
  recorded: '已记录',
  enabled: '已启用',
  granted: '已授权',
  revoked: '已撤销',
  pending: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
  running: '执行中',
  succeeded: '执行成功',
  failed: '执行失败',
  queued: '待启动',
  interrupted: '已中断',
  cancelled: '已取消',
};

function stateLabel(state: string): string {
  return STATE_LABELS[state] ?? state;
}

export function ExecutionConsolePanel({ runtime }: { runtime: RuntimeInfo | null }) {
  const consoleState = useExecutionConsole(runtime);

  return (
    <section className="work-panel execution-panel" id="execution-console" aria-labelledby="execution-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CONTROLLED EXECUTION · 1.2.0 / ISOLATED RUNS · 1.3.0</p>
          <h2 id="execution-title">受控执行状态</h2>
        </div>
        <button className="button-secondary" type="button" onClick={consoleState.load}
          disabled={!consoleState.supported || consoleState.busy || consoleState.phase === 'loading'}>
          {consoleState.phase === 'loading' ? '读取中…' : '刷新执行状态'}
        </button>
      </div>

      {consoleState.phase === 'unsupported' && <div className="work-notice" role="status">
        <p>当前 Runtime 未发布 <code>executionContract: 1.2.0</code>；受控执行台保持关闭。</p>
      </div>}
      {consoleState.error && <div className="work-error" role="alert"><p>{consoleState.error}</p></div>}
      {consoleState.message && <p className="task-hint" role="status">{consoleState.message}</p>}

      {consoleState.supported && <>
        <div className="execution-notice" role="note">
          `1.2.0` 是确定性 fake executor；`1.3.0` 是 Runtime 拥有的隔离子进程，只接受封闭的 hash / echo_length / fixed_matrix 操作。两者都不安装 MCP、不加载 Skill/plugin、不执行任意宿主命令、不写外部系统、不读取明文密钥。能力记录与显式授权、审批、执行结果是不同状态。
        </div>

        <div className="execution-grid">
          <article className="organization-card" aria-labelledby="execution-capability-title">
            <h3 id="execution-capability-title">能力记录</h3>
            {consoleState.capabilities.map((capability) => (
              <button
                className={`organization-project-row${capability.id === consoleState.selectedCapabilityId ? ' is-selected' : ''}`}
                key={capability.id}
                type="button"
                onClick={() => consoleState.selectCapability(capability.id)}
              >
                <strong>{stateLabel(capability.state)} · {capability.kind}</strong>
                <code>{capability.id}</code>
                <small>{capability.destinationDigest}</small>
              </button>
            ))}
            <label className="execution-field" htmlFor="execution-operation">操作</label>
            <input id="execution-operation" value={consoleState.operation}
              onChange={(event) => consoleState.setOperation(event.target.value)} />
            <button className="button-primary" type="button" onClick={consoleState.createGrant}
              disabled={consoleState.busy}>创建显式授权</button>
          </article>

          <article className="organization-card" aria-labelledby="execution-grant-title">
            <h3 id="execution-grant-title">显式授权</h3>
            {consoleState.grants.length === 0 && <p className="task-hint">Runtime 尚未发布授权。</p>}
            {consoleState.grants.map((grant) => (
              <div className="organization-fact" key={grant.id}>
                <strong>{stateLabel(grant.state)}</strong><code>{grant.id}</code>
                <small>v{grant.expectedVersion} · {grant.operation} · {grant.agentRevisionId}</small>
                {grant.state === 'granted' && <>
                  <button className="button-secondary" type="button" disabled={consoleState.busy}
                    onClick={() => consoleState.createRequest(grant)}>提交请求</button>
                  <button className="button-secondary" type="button" disabled={consoleState.busy}
                    onClick={() => consoleState.revokeGrant(grant)}>撤销</button>
                </>}
              </div>
            ))}
          </article>

          <article className="organization-card" aria-labelledby="execution-request-title">
            <h3 id="execution-request-title">请求与结果</h3>
            {consoleState.requests.length === 0 && <p className="task-hint">尚未在本会话提交请求。</p>}
            {[...consoleState.requests].reverse().map((request) => (
              <div className="organization-fact" key={request.id}>
                <strong>{stateLabel(request.state)}</strong><code>{request.id}</code>
                <small>v{request.expectedVersion} · {request.operation}</small>
                {request.state === 'pending' && <>
                  <button className="button-primary" type="button" disabled={consoleState.busy}
                    onClick={() => consoleState.approveRequest(request)}>批准并假执行</button>
                  <button className="button-secondary" type="button" disabled={consoleState.busy}
                    onClick={() => consoleState.rejectRequest(request)}>拒绝</button>
                </>}
                {request.resultDigest && <small>result {request.resultDigest}</small>}
                {consoleState.runsSupported && request.state === 'succeeded' && (
                  <button className="button-secondary" type="button" disabled={consoleState.busy}
                    onClick={() => consoleState.createRun(request)}>创建隔离 run</button>
                )}
              </div>
            ))}
          </article>

          <article className="organization-card" aria-labelledby="execution-run-title">
            <h3 id="execution-run-title">隔离执行 Runs</h3>
            {!consoleState.runsSupported && <p className="task-hint">当前 Runtime 未发布 executionRunContract: 1.3.0。</p>}
            {consoleState.runsSupported && consoleState.runs.length === 0 && <p className="task-hint">尚未发布隔离执行 run。</p>}
            {[...consoleState.runs].reverse().map((run) => (
              <div className="organization-fact" key={run.id}>
                <strong>{stateLabel(run.state)}</strong><code>{run.id}</code>
                <small>v{run.expectedVersion} · attempt {run.attempt} · {run.operation} · exit {run.exitCode ?? '—'}</small>
                {run.resultDigest && <small>result {run.resultDigest}</small>}
                {run.errorDigest && <small>error {run.errorDigest}</small>}
                {run.state === 'queued' && <>
                  <button className="button-primary" type="button" disabled={consoleState.busy}
                    onClick={() => consoleState.startRun(run)}>启动隔离子进程</button>
                  <button className="button-secondary" type="button" disabled={consoleState.busy}
                    onClick={() => consoleState.cancelRun(run)}>取消</button>
                </>}
                {(run.state === 'interrupted' || run.state === 'failed') && (
                  <button className="button-secondary" type="button" disabled={consoleState.busy}
                    onClick={() => consoleState.recoverRun(run)}>恢复</button>
                )}
              </div>
            ))}
          </article>

          <article className="organization-card" aria-labelledby="execution-run-event-title">
            <h3 id="execution-run-event-title">Run 审计事件</h3>
            {[...consoleState.runEvents].slice(-12).reverse().map((event) => (
              <p className="organization-fact" key={event.id}>
                <span>#{event.sequence}</span><code>{event.type}</code>
              </p>
            ))}
          </article>

          <article className="organization-card" aria-labelledby="execution-event-title">
            <h3 id="execution-event-title">审计事件</h3>
            {[...consoleState.events].slice(-12).reverse().map((event) => (
              <p className="organization-fact" key={event.id}>
                <span>#{event.sequence}</span><code>{event.type}</code>
              </p>
            ))}
          </article>
        </div>
      </>}
    </section>
  );
}
