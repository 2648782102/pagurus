import { useEffect, useState } from 'react';
import { useAgents } from './useAgents.js';
import type { AgentRevision } from '../../shared/api/agents.js';

function providerName(providerId: string): string {
  return providerId;
}

function earliestRevision(revisions: readonly AgentRevision[]): AgentRevision | undefined {
  return revisions.reduce<AgentRevision | undefined>((earliest, revision) => {
    if (!earliest || revision.createdAt < earliest.createdAt) return revision;
    return earliest;
  }, undefined);
}

export function AgentWorkspace({ onAgentsChanged }: { onAgentsChanged?: () => void }) {
  const agents = useAgents(onAgentsChanged);
  const selected = agents.selected;
  const [compareLeftId, setCompareLeftId] = useState('');
  const [compareRightId, setCompareRightId] = useState('');
  const busy = agents.phase === 'saving' || agents.phase === 'loading';
  const currentReference = agents.models.find((model) => model.reference === agents.modelReference);
  const defaultCompareLeftId = selected?.currentRevisionId ?? '';
  const defaultCompareRightId = selected ? earliestRevision(selected.revisions)?.id ?? selected.currentRevisionId : '';

  useEffect(() => {
    if (!selected) {
      setCompareLeftId('');
      setCompareRightId('');
      return;
    }
    setCompareLeftId(selected.currentRevisionId);
    setCompareRightId(earliestRevision(selected.revisions)?.id ?? selected.currentRevisionId);
  }, [selected?.currentRevisionId, selected?.id, selected?.revisions.length]);

  return (
    <section className="agent-panel" id="agent-panel" aria-labelledby="agent-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">AGENT WORKSPACE</p>
          <h2 id="agent-title">Agent 配置</h2>
        </div>
        {agents.supported && <span className="muted-label">{agents.agents.length} 个配置</span>}
      </div>

      {agents.phase === 'loading' && <p className="task-hint" role="status">正在读取 Runtime Agent 和模型目录…</p>}
      {agents.phase === 'unsupported' && (
        <div className="agent-notice">
          <strong>当前 Runtime 未开放 Agent 管理</strong>
          <p>任务运行和全局配置仍可照常使用。连接支持 agents 与 provider-neutral-model-catalog 能力的 Conchbase 后，此处即可管理 Agent。</p>
        </div>
      )}
      {agents.phase === 'error' && (
        <div className="agent-notice" role="alert">
          <p>{agents.error}</p>
          <button className="button-secondary" type="button" onClick={() => agents.refresh()}>重新加载</button>
        </div>
      )}

      {agents.supported && (
        <>
          <div className="agent-toolbar">
            <label htmlFor="agent-select">选择 Agent</label>
            <select
              id="agent-select"
              value={selected?.id ?? ''}
              onChange={(event) => agents.select(event.target.value)}
              disabled={busy || agents.agents.length === 0}
            >
              {agents.agents.length === 0 && <option value="">还没有 Agent</option>}
              {agents.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.current.name}{agent.isDefault ? ' · 默认' : ''}{agent.archived ? ' · 已归档' : ''}
                </option>
              ))}
            </select>
            <button className="button-secondary" type="button" onClick={agents.startNew} disabled={busy}>新建 Agent</button>
          </div>

          {agents.models.length === 0 && <p className="task-hint">Runtime 当前没有可选择的模型。</p>}
          <form className="agent-editor" onSubmit={(event) => { event.preventDefault(); agents.save(); }}>
            <div className="agent-editor-heading">
              <div>
                <label htmlFor="agent-name">名称</label>
                {selected && <code>{selected.id}</code>}
              </div>
              {selected && <span className={`agent-state${selected.archived ? ' is-archived' : ''}`}>
                {selected.archived ? '已归档' : selected.isDefault ? '默认 Agent' : '可用'}
              </span>}
            </div>
            <input
              id="agent-name"
              value={agents.name}
              onChange={(event) => agents.setName(event.target.value)}
              maxLength={120}
              required
              disabled={busy || selected?.archived}
            />

            <label htmlFor="agent-instructions">Instructions</label>
            <textarea
              id="agent-instructions"
              value={agents.instructions}
              onChange={(event) => agents.setInstructions(event.target.value)}
              maxLength={20000}
              rows={6}
              placeholder="定义这个 Agent 的工作目标、语气和边界。这里的指令不会授予工具或权限。"
              disabled={busy || selected?.archived}
            />

            <label htmlFor="agent-model">默认模型</label>
            <select
              id="agent-model"
              value={agents.modelReference}
              onChange={(event) => agents.setModelReference(event.target.value)}
              disabled={busy || selected?.archived || agents.models.length === 0}
              required
            >
              {agents.models.map((model) => (
                <option key={model.reference} value={model.reference}>
                  {model.displayName} · {providerName(model.providerId)} / {model.modelId}
                </option>
              ))}
            </select>
            {currentReference && <p className="task-hint">provider-neutral reference：<code>{currentReference.reference}</code></p>}

            <div className="agent-actions">
              <button className="button-primary" type="submit" disabled={busy || !agents.models.length || selected?.archived}>
                {agents.phase === 'saving' ? '保存中…' : selected ? '保存新版本' : '创建 Agent'}
              </button>
              {selected && !selected.archived && <>
                {!selected.isDefault && <button className="button-secondary" type="button" onClick={agents.makeDefault} disabled={busy}>设为默认</button>}
                {selected.isDefault && <button className="button-secondary" type="button" onClick={agents.clearDefault} disabled={busy}>取消默认</button>}
                <button className="button-secondary" type="button" onClick={agents.duplicate} disabled={busy}>复制</button>
                <button className="button-secondary danger-action" type="button" onClick={agents.archive} disabled={busy}>归档</button>
              </>}
            </div>
          </form>

          {selected && (
            <div className="agent-history">
              <div className="section-heading">
                <div><p className="eyebrow">IMMUTABLE HISTORY</p><h3>版本历史</h3></div>
                <span className="muted-label">当前版本 <code>{selected.currentRevisionId}</code></span>
              </div>
              <ol className="revision-list">
                {[...selected.revisions].reverse().map((revision) => (
                  <li key={revision.id}>
                    <div><strong>{revision.name}</strong><code>{revision.id}</code><small>{new Date(revision.createdAt).toLocaleString()}</small></div>
                    {revision.id === selected.currentRevisionId
                      ? <span className="revision-current">当前</span>
                      : <button
                        className="button-secondary"
                        type="button"
                        disabled={busy || selected.archived}
                        onClick={() => agents.rollback(revision.id)}
                      >恢复此版本</button>}
                  </li>
                ))}
              </ol>
              <RevisionComparison
                revisions={selected.revisions}
                leftId={compareLeftId || defaultCompareLeftId}
                rightId={compareRightId || defaultCompareRightId}
                onLeftChange={setCompareLeftId}
                onRightChange={setCompareRightId}
              />
            </div>
          )}
          {agents.message && <p className="config-message" role="status">{agents.message}</p>}
          {agents.error && <div className="agent-error" role="alert"><p>{agents.error}</p>
            {agents.error.includes('重新加载') || agents.error.includes('Agent 已被其他操作更新')
              ? <button className="button-secondary" type="button" onClick={() => agents.refresh(selected?.id)}>重新加载当前版本</button>
              : null}
          </div>}
        </>
      )}
    </section>
  );
}

function RevisionComparison({
  revisions,
  leftId,
  rightId,
  onLeftChange,
  onRightChange,
}: {
  revisions: readonly AgentRevision[];
  leftId: string;
  rightId: string;
  onLeftChange: (id: string) => void;
  onRightChange: (id: string) => void;
}) {
  const left = revisions.find((revision) => revision.id === leftId);
  const right = revisions.find((revision) => revision.id === rightId);
  const hasComparison = revisions.length > 1 && left && right && left.id !== right.id;

  return (
    <div className="revision-compare" aria-labelledby="revision-compare-title">
      <div className="section-heading">
        <div><p className="eyebrow">REVISION COMPARE</p><h3 id="revision-compare-title">比较两个版本</h3></div>
        <span className="muted-label">只读比较</span>
      </div>
      {revisions.length < 2 ? <p className="task-hint">至少保存两个版本后才能比较。</p> : <>
        <div className="revision-compare-selects">
          <label htmlFor="revision-compare-left">版本 A</label>
          <select id="revision-compare-left" value={leftId} onChange={(event) => onLeftChange(event.target.value)}>
            {revisions.map((revision) => <option key={revision.id} value={revision.id}>{revision.name} · {revision.id}</option>)}
          </select>
          <label htmlFor="revision-compare-right">版本 B</label>
          <select id="revision-compare-right" value={rightId} onChange={(event) => onRightChange(event.target.value)}>
            {revisions.map((revision) => <option key={revision.id} value={revision.id}>{revision.name} · {revision.id}</option>)}
          </select>
        </div>
        {!hasComparison && <p className="task-hint">请选择两个不同的版本。</p>}
        {hasComparison && <div className="revision-compare-grid">
          <CompareField label="名称" left={left.name} right={right.name} />
          <CompareField label="Instructions" left={left.instructions} right={right.instructions} multiline />
          <CompareField label="默认模型" left={`${left.providerId} / ${left.modelId}`} right={`${right.providerId} / ${right.modelId}`} />
          <CompareField label="版本 id" left={left.id} right={right.id} mono />
        </div>}
      </>}
    </div>
  );
}

function CompareField({
  label,
  left,
  right,
  multiline = false,
  mono = false,
}: {
  label: string;
  left: string;
  right: string;
  multiline?: boolean;
  mono?: boolean;
}) {
  const changed = left !== right;
  return (
    <div className={`compare-field${changed ? ' is-changed' : ''}`}>
      <dt>{label}{changed ? ' · 已变化' : ' · 相同'}</dt>
      <dd className={mono ? 'compare-mono' : undefined}><span>{left || '（空）'}</span><span>{right || '（空）'}</span></dd>
      {multiline && <small>版本 A / 版本 B</small>}
    </div>
  );
}
