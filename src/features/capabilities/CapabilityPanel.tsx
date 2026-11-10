import { useState, type FormEvent } from 'react';
import type { CapabilityKind, CapabilityStatus } from '../../shared/api/platform.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { useCapabilities } from './useCapabilities.js';

export function CapabilityPanel({ runtime }: { runtime: RuntimeInfo | null }) {
  const capabilities = useCapabilities(runtime);
  const [kind, setKind] = useState<CapabilityKind>('mcp');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<CapabilityStatus>('enabled');
  const [descriptor, setDescriptor] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !descriptor.trim()) return;
    capabilities.submit({ kind, name: name.trim(), status, descriptor: descriptor.trim() });
    setName('');
    setDescriptor('');
  };

  return (
    <section className="task-panel" id="capabilities" aria-labelledby="capability-title">
      <div className="section-heading">
        <div><p className="eyebrow">CAPABILITY DIRECTORY</p><h2 id="capability-title">能力目录</h2></div>
        <button className="button-secondary" type="button" onClick={capabilities.load}
          disabled={capabilities.pending || capabilities.phase === 'loading'
            || capabilities.phase === 'checking' || capabilities.phase === 'unsupported'}>刷新</button>
      </div>
      {capabilities.phase === 'checking' && <p className="task-hint" role="status">正在检查 capability-directory 能力…</p>}
      {capabilities.phase === 'unsupported' && (
        <div className="work-notice" role="status">
          <p>当前 Runtime 未发布 <code>capability-directory</code>，能力目录保持关闭状态。</p>
        </div>
      )}
      {capabilities.phase === 'loading' && <p className="task-hint" role="status">正在读取能力目录…</p>}
      {capabilities.phase === 'error' && <div className="work-error" role="alert"><p>{capabilities.error}</p></div>}
      {capabilities.message && <p className="task-hint" role="status">{capabilities.message}</p>}
      {capabilities.phase === 'ready' && <>
        {capabilities.capabilities.length === 0 && <p className="task-hint">暂无能力记录。</p>}
        <div className="revision-list">
          {capabilities.capabilities.map((record) => (
            <li key={record.id}>
              <div><strong>{record.kind} · {record.name}</strong><small>{record.descriptor}</small></div>
              <span className={record.status === 'enabled' ? 'agent-state' : 'agent-state is-archived'}>{record.status}</span>
            </li>
          ))}
        </div>
      </>}
      {capabilities.phase !== 'checking' && capabilities.phase !== 'unsupported' && <form className="agent-editor" onSubmit={submit}>
        <div className="task-field"><label htmlFor="capability-kind">类型</label>
          <select id="capability-kind" value={kind} onChange={(event) => setKind(event.target.value as CapabilityKind)}>
            <option value="mcp">MCP</option><option value="skill">Skill</option>
            <option value="plugin">Plugin</option><option value="secret-handle">SecretHandle</option>
          </select>
        </div>
        <div className="task-field"><label htmlFor="capability-name">名称</label>
          <input id="capability-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
        </div>
        <div className="task-field"><label htmlFor="capability-status">状态</label>
          <select id="capability-status" value={status} onChange={(event) => setStatus(event.target.value as CapabilityStatus)}>
            <option value="enabled">启用记录</option><option value="disabled">禁用记录</option>
          </select>
        </div>
        <div className="task-field"><label htmlFor="capability-descriptor">描述</label>
          <input id="capability-descriptor" value={descriptor} onChange={(event) => setDescriptor(event.target.value)} maxLength={200} />
        </div>
        <div className="task-actions">
          <button className="button-primary" type="submit" disabled={capabilities.pending || !name.trim() || !descriptor.trim()}>
            {capabilities.pending ? '保存中…' : '保存能力记录'}
          </button>
        </div>
      </form>}
      <p className="task-note">这些记录只是配置数据，不安装代码、授予权限、连接 MCP、加载 Skill 或执行插件。</p>
    </section>
  );
}
