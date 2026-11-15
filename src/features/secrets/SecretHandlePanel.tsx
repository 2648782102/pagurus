import { useState, type FormEvent } from 'react';
import type { SecretHandleStatus } from '../../shared/api/platform.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { useSecretHandles } from './useSecretHandles.js';
import { Button, EmptyState, Field, Notice, Section, TextInput } from '../../shared/ui/primitives.js';

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
    <Section
      className="task-panel"
      id="secrets-title"
      title="敏感信息句柄"
      description="只写提交 · 摘要收据"
      action={<Button size="sm" type="button" onClick={secrets.load}
          disabled={secrets.pending !== null || secrets.phase === 'loading'
            || secrets.phase === 'checking' || secrets.phase === 'unsupported'}>刷新</Button>}
    >
      {secrets.phase === 'checking' && <p className="task-hint" role="status">正在检查 write-only-secret-handles 能力…</p>}
      {secrets.phase === 'unsupported' && (
        <Notice>当前 Runtime 未发布 <code>write-only-secret-handles</code>，句柄编辑器保持关闭状态。</Notice>
      )}
      {secrets.phase === 'loading' && <p className="task-hint" role="status">正在读取摘要元数据…</p>}
      {secrets.phase === 'error' && <Notice tone="danger">{secrets.error}</Notice>}
      {secrets.message && <p className="task-hint" role="status">{secrets.message}</p>}

      {secrets.phase !== 'checking' && secrets.phase !== 'unsupported' && <form className="agent-editor secret-create-form" onSubmit={create}>
        <Field label="Key" htmlFor="secret-key">
          <TextInput id="secret-key" value={key} onChange={(event) => setKey(event.target.value)} maxLength={120} />
        </Field>
        <Field label="只写 value（提交后清除，不回读）" htmlFor="secret-value">
          <TextInput id="secret-value" type="password" autoComplete="off" value={value}
            onChange={(event) => setValue(event.target.value)} />
        </Field>
        <Field label="用途" htmlFor="secret-purpose">
          <TextInput id="secret-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} maxLength={200} />
        </Field>
        <Field label="固定 adapter" htmlFor="secret-adapter">
          <TextInput id="secret-adapter" value={allowedAdapter} onChange={(event) => setAllowedAdapter(event.target.value)} maxLength={80} />
        </Field>
        <Field label="目标绑定" htmlFor="secret-destination">
          <TextInput id="secret-destination" value={destinationBinding}
            onChange={(event) => setDestinationBinding(event.target.value)} maxLength={80} />
        </Field>
        <div className="task-actions">
          <Button variant="primary" type="submit"
            disabled={secrets.pending !== null || !key.trim() || !value || !purpose.trim()}>
            {secrets.pending === 'create' ? '提交中…' : '一次性提交'}
          </Button>
        </div>
      </form>}

      {secrets.phase === 'ready' && <>
        {secrets.handles.length === 0 && (
          <EmptyState
            tone="compact"
            title="暂无句柄。"
            description="提交一次值后会生成 Key、状态和摘要；明文不会被回读或保留在界面中。"
          />
        )}
        <ul className="revision-list">
          {secrets.handles.map((handle) => (
            <li key={handle.id}>
              <div>
                <strong>{handle.key} · v{handle.secretVersion}</strong>
                <small>{handle.status} · {handle.allowedAdapter} · <code>{handle.valueDigest}</code></small>
                <small>{handle.purpose} · {handle.destinationBinding}</small>
              </div>
              <div className="task-actions">
                <TextInput type="password" autoComplete="off" aria-label={`轮换 ${handle.key} 的值`}
                  value={rotation[handle.id] ?? ''}
                  onChange={(event) => setRotation((current) => ({ ...current, [handle.id]: event.target.value }))} />
                <Button size="sm" type="button" disabled={secrets.pending !== null || !rotation[handle.id]}
                  onClick={() => rotate(handle.id)}>轮换</Button>
                <Button size="sm" type="button" disabled={secrets.pending !== null}
                  onClick={() => secrets.status(handle.id, handle.status === 'active' ? 'disabled' : 'active' as SecretHandleStatus)}>
                  {handle.status === 'active' ? '禁用' : '启用'}
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <div className="work-section">
          <h4>固定适配器使用</h4>
          <Field label="WorkItem id" htmlFor="secret-work-item">
            <TextInput id="secret-work-item" value={workItemId} onChange={(event) => setWorkItemId(event.target.value)} />
          </Field>
          <Field label="Assignment id" htmlFor="secret-assignment">
            <TextInput id="secret-assignment" value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} />
          </Field>
          <Field label="Grant revision" htmlFor="secret-grant">
            <TextInput id="secret-grant" value={grantRevision} onChange={(event) => setGrantRevision(event.target.value)} />
          </Field>
          <div className="task-actions">
            {secrets.handles.filter((handle) => handle.status === 'active').map((handle) => (
              <Button size="sm" key={handle.id} type="button" disabled={
                secrets.pending !== null || !workItemId.trim() || !assignmentId.trim() || !grantRevision.trim()
              } onClick={() => secrets.use({
                handleId: handle.id,
                workItemId: workItemId.trim(),
                assignmentId: assignmentId.trim(),
                grantRevision: grantRevision.trim(),
              })}>使用 {handle.key}</Button>
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
    </Section>
  );
}
