import { useState, type FormEvent } from 'react';
import type { CapabilityKind, CapabilityStatus } from '../../shared/api/platform.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { useCapabilities } from './useCapabilities.js';
import { Button, EmptyState, Field, Notice, Section, Select, SkeletonRows, Tag, TextInput } from '../../shared/ui/primitives.js';

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
    <Section
      className="task-panel"
      id="capability-title"
      title="能力目录"
      description="配置记录，不是安装或授权"
      action={<Button size="sm" type="button" onClick={capabilities.load}
          disabled={capabilities.pending || capabilities.phase === 'loading'
            || capabilities.phase === 'checking' || capabilities.phase === 'unsupported'}>刷新</Button>}
    >
      {capabilities.phase === 'checking' && <p className="task-hint" role="status">正在检查 capability-directory 能力…</p>}
      {capabilities.phase === 'unsupported' && (
        <Notice>当前 Runtime 未发布 <code>capability-directory</code>，能力目录保持关闭状态。</Notice>
      )}
      {/*
       * Rows rather than a sentence: the panel is about to be a list, so
       * showing its shape while it reads means the arrival is a fill rather
       * than a jump. The `checking` phase above keeps its sentence, because at
       * that point the panel does not yet know whether it will have a list.
       */}
      {capabilities.phase === 'loading' && <SkeletonRows rows={4} label="正在读取能力目录…" />}
      {capabilities.phase === 'error' && <Notice tone="danger">{capabilities.error}</Notice>}
      {capabilities.message && <p className="task-hint" role="status">{capabilities.message}</p>}
      {capabilities.phase === 'ready' && <>
        {capabilities.capabilities.length === 0 && (
          <EmptyState
            tone="compact"
            title="暂无能力记录。"
            description="能力目录只保存有界元数据；添加记录不会安装 MCP、Skill 或插件，也不会授予权限。"
          />
        )}
        <ul className="revision-list">
          {capabilities.capabilities.map((record) => (
            <li key={record.id}>
              <div><strong>{record.kind} · {record.name}</strong><small>{record.descriptor}</small></div>
              <Tag tone={record.status === 'enabled' ? 'success' : 'neutral'}>{record.status}</Tag>
            </li>
          ))}
        </ul>
      </>}
      {capabilities.phase !== 'checking' && capabilities.phase !== 'unsupported' && <form className="agent-editor config-form-surface" onSubmit={submit}>
        <Field label="类型" htmlFor="capability-kind">
          <Select id="capability-kind" value={kind} onChange={(event) => setKind(event.target.value as CapabilityKind)}>
            <option value="mcp">MCP</option><option value="skill">Skill</option>
            <option value="plugin">Plugin</option><option value="secret-handle">SecretHandle</option>
          </Select>
        </Field>
        <Field label="名称" htmlFor="capability-name">
          <TextInput id="capability-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
        </Field>
        <Field label="状态" htmlFor="capability-status">
          <Select id="capability-status" value={status} onChange={(event) => setStatus(event.target.value as CapabilityStatus)}>
            <option value="enabled">启用记录</option><option value="disabled">禁用记录</option>
          </Select>
        </Field>
        <Field label="描述" htmlFor="capability-descriptor">
          <TextInput id="capability-descriptor" value={descriptor} onChange={(event) => setDescriptor(event.target.value)} maxLength={200} />
        </Field>
        <div className="task-actions">
          <Button variant="primary" type="submit" disabled={capabilities.pending || !name.trim() || !descriptor.trim()}>
            {capabilities.pending ? '保存中…' : '保存能力记录'}
          </Button>
        </div>
      </form>}
      <p className="task-note">这些记录只是配置数据，不安装代码、授予权限、连接 MCP、加载 Skill 或执行插件。</p>
    </Section>
  );
}
