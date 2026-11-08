import { useConfiguration } from './useConfiguration.js';

export function ConfigurationPanel() {
  const configuration = useConfiguration();
  const busy = configuration.phase === 'validating' || configuration.phase === 'applying';
  const canEdit = configuration.phase === 'ready';

  return (
    <section className="config-panel" aria-labelledby="configuration-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CONFIGURATION REVISIONS</p>
          <h2 id="configuration-title">配置版本</h2>
        </div>
        <span className="muted-label">Conchbase 0.5.0 契约</span>
      </div>

      <p className="config-intro">
        这里编辑的是版本化配置文档，不是能力安装器。引用只作为数据保存，由海螺校验并固定到之后创建的任务。
      </p>

      <div className="config-status" aria-live="polite">
        <span className="detail-label">当前版本</span>
        <code>{configuration.revision?.id ?? '—'}</code>
        <span className="detail-label">版本数</span>
        <code>{configuration.revisions.length || '—'}</code>
      </div>

      {configuration.phase === 'loading' && <p className="task-hint">正在读取运行时配置版本…</p>}
      {configuration.phase === 'unsupported' && (
        <p className="error-message" role="status">{configuration.message}</p>
      )}
      {configuration.phase === 'disconnected' && (
        <div className="config-recovery">
          <p className="error-message" role="alert">{configuration.message}</p>
          <button className="button-secondary" type="button" onClick={configuration.load}>
            重新加载配置
          </button>
        </div>
      )}
      {configuration.message && canEdit && (
        <p className="config-message" role="status">{configuration.message}</p>
      )}
      {configuration.issues.length > 0 && (
        <ul className="config-issues" aria-label="配置校验问题">
          {configuration.issues.map((issue, index) => (
            <li key={`${issue.path}-${index}`}><code>{issue.path}</code> · {issue.reason}</li>
          ))}
        </ul>
      )}

      <div className="config-editor">
        <label htmlFor="configuration-document">配置文档 JSON</label>
        <textarea
          id="configuration-document"
          value={configuration.draft}
          onChange={(event) => configuration.setDraft(event.target.value)}
          spellCheck={false}
          rows={12}
          disabled={!canEdit || busy}
          aria-describedby="configuration-document-help"
        />
        <p id="configuration-document-help" className="task-hint">
          接受 schemaVersion 1 或 2；v2 需要 composition 段和 runtime 的 composition-execution 能力。不要输入密钥值，secretRefs 只保存不透明引用。
        </p>
        <div className="task-actions">
          <button
            className="button-primary"
            type="button"
            onClick={configuration.apply}
            disabled={!canEdit || busy}
          >
            {configuration.phase === 'validating' ? '校验中…' : configuration.phase === 'applying' ? '应用中…' : '校验并应用'}
          </button>
        </div>
      </div>

      <div className="config-history">
        <label htmlFor="configuration-rollback">切换到历史版本</label>
        <select
          id="configuration-rollback"
          value={configuration.rollbackId}
          onChange={(event) => configuration.setRollbackId(event.target.value)}
          disabled={!canEdit || busy || configuration.revisions.length < 2}
        >
          <option value="">选择一个版本</option>
          {configuration.revisions.map((revision) => (
            <option key={revision.id} value={revision.id}>
              {revision.name} · {revision.id}
            </option>
          ))}
        </select>
        <button
          className="button-secondary"
          type="button"
          onClick={configuration.rollback}
          disabled={!canEdit || busy || !configuration.rollbackId}
        >
          回滚到所选版本
        </button>
      </div>
    </section>
  );
}
