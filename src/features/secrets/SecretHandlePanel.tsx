import { useState, type FormEvent } from 'react';
import type { SecretHandleStatus } from '../../shared/api/platform.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { useSecretHandles } from './useSecretHandles.js';

export function SecretHandlePanel({ runtime }: { runtime: RuntimeInfo | null }) {
  const secrets = useSecretHandles(runtime);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [purpose, setPurpose] = useState('');
  const [allowedAdapter, setAllowedAdapter] = useState('local-bound-fixture');
  const [destinationBinding, setDestinationBinding] = useState('local-fixture');
  const [rotation, setRotation] = useState<Record<string, string>>({});
  const [workItemId, setWorkItemId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [grantRevision, setGrantRevision] = useState('');

  const clearOneShotFields = () => {
    setValue('');
    setRotation({});
  };

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!key.trim() || !value || !purpose.trim()) return;
    const submitted = {
      key: key.trim(),
      value,
      purpose: purpose.trim(),
      allowedAdapter: allowedAdapter.trim(),
      destinationBinding: destinationBinding.trim(),
    };
    clearOneShotFields();
    secrets.create(submitted);
  };

  const rotate = (handleId: string) => {
    const next = rotation[handleId] ?? '';
    if (!next) return;
    setRotation({});
    secrets.rotate(handleId, next);
  };

  return (
    <section className="task-panel" id="secrets" aria-labelledby="secrets-title">
      <div className="section-heading">
        <div><p className="eyebrow">WRITE-ONLY HANDLES</p><h2 id="secrets-title">敏感信息句柄</h2></div>
        <button className="button-secondary" type="button" onClick={secrets.load}
          disabled={secrets.pending !== null || secrets.phase === 'loading'
            || secrets.phase === 'checking' || secrets.phase === 'unsupported'}>刷新</button>
      </div>
      {secrets.phase === 'checking' && <p className="task-hint" role="status">正在检查 write-only-secret-handles 能力…</p>}
      {secrets.phase === 'unsupported' && (
        <div className="work-notice" role="status">
          <p>当前 Runtime 未发布 <code>write-only-secret-handles</code>，句柄编辑器保持关闭状态。</p>
        </div>
      )}
      {secrets.phase === 'loading' && <p className="task-hint" role="status">正在读取摘要元数据…</p>}
      {secrets.phase === 'error' && <div className="work-error" role="alert"><p>{secrets.error}</p></div>}
      {secrets.message && <p className="task-hint" role="status">{secrets.message}</p>}

      {secrets.phase !== 'checking' && secrets.phase !== 'unsupported' && <form className="agent-editor" onSubmit={create}>
        <div className="task-field"><label htmlFor="secret-key">Key</label>
          <input id="secret-key" value={key} onChange={(event) => setKey(event.target.value)} maxLength={120} />
        </div>
        <div className="task-field"><label htmlFor="secret-value">只写 value（提交后清除，不回读）</label>
          <input id="secret-value" type="password" autoComplete="off" value={value}
            onChange={(event) => setValue(event.target.value)} />
        </div>
        <div className="task-field"><label htmlFor="secret-purpose">用途</label>
          <input id="secret-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} maxLength={200} />
        </div>
        <div className="task-field"><label htmlFor="secret-adapter">固定 adapter</label>
          <input id="secret-adapter" value={allowedAdapter} onChange={(event) => setAllowedAdapter(event.target.value)} maxLength={80} />
        </div>
        <div className="task-field"><label htmlFor="secret-destination">目标绑定</label>
          <input id="secret-destination" value={destinationBinding}
            onChange={(event) => setDestinationBinding(event.target.value)} maxLength={80} />
        </div>
        <div className="task-actions">
          <button className="button-primary" type="submit"
            disabled={secrets.pending !== null || !key.trim() || !value || !purpose.trim()}>
            {secrets.pending === 'create' ? '提交中…' : '一次性提交'}
          </button>
        </div>
      </form>}

      {secrets.phase === 'ready' && <>
        {secrets.handles.length === 0 && <p className="task-hint">暂无句柄。</p>}
        <div className="revision-list">
          {secrets.handles.map((handle) => (
            <li key={handle.id}>
              <div>
                <strong>{handle.key} · v{handle.secretVersion}</strong>
                <small>{handle.status} · {handle.allowedAdapter} · <code>{handle.valueDigest}</code></small>
                <small>{handle.purpose} · {handle.destinationBinding}</small>
              </div>
              <div className="task-actions">
                <input type="password" autoComplete="off" aria-label={`轮换 ${handle.key} 的值`}
                  value={rotation[handle.id] ?? ''}
                  onChange={(event) => setRotation((current) => ({ ...current, [handle.id]: event.target.value }))} />
                <button className="button-secondary" type="button" disabled={secrets.pending !== null || !rotation[handle.id]}
                  onClick={() => rotate(handle.id)}>轮换</button>
                <button className="button-secondary" type="button" disabled={secrets.pending !== null}
                  onClick={() => secrets.status(handle.id, handle.status === 'active' ? 'disabled' : 'active' as SecretHandleStatus)}>
                  {handle.status === 'active' ? '禁用' : '启用'}
                </button>
              </div>
            </li>
          ))}
        </div>

        <div className="work-section">
          <h4>固定适配器使用</h4>
          <div className="task-field"><label htmlFor="secret-work-item">WorkItem id</label>
            <input id="secret-work-item" value={workItemId} onChange={(event) => setWorkItemId(event.target.value)} />
          </div>
          <div className="task-field"><label htmlFor="secret-assignment">Assignment id</label>
            <input id="secret-assignment" value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} />
          </div>
          <div className="task-field"><label htmlFor="secret-grant">Grant revision</label>
            <input id="secret-grant" value={grantRevision} onChange={(event) => setGrantRevision(event.target.value)} />
          </div>
          <div className="task-actions">
            {secrets.handles.filter((handle) => handle.status === 'active').map((handle) => (
              <button className="button-secondary" key={handle.id} type="button" disabled={
                secrets.pending !== null || !workItemId.trim() || !assignmentId.trim() || !grantRevision.trim()
              } onClick={() => secrets.use({
                handleId: handle.id,
                workItemId: workItemId.trim(),
                assignmentId: assignmentId.trim(),
                grantRevision: grantRevision.trim(),
              })}>使用 {handle.key}</button>
            ))}
          </div>
        </div>

        <div className="work-section">
          <h4>摘要收据</h4>
          {secrets.receipts.length === 0 && <p className="task-hint">暂无使用收据。</p>}
          {secrets.receipts.map((receipt) => (
            <p className="work-evidence" key={receipt.id}>
              <span>{receipt.outcome}</span><code>{receipt.handleId}</code>
              <code>{receipt.secretVersionDigest}</code><code>{receipt.destinationDigest}</code>
            </p>
          ))}
        </div>
      </>}

      <p className="task-note">Pagurus 只提交一次性 value，不回读、不显示、不存储明文；Runtime 重启会使旧封存值失效，需重新轮换。</p>
    </section>
  );
}
