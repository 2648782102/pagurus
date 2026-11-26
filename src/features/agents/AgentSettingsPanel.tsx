import { useEffect, useState } from 'react';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import type { Agent } from '../../shared/api/agents.js';
import { useAgentSettings } from './useAgentSettings.js';
import { useCapabilityCatalog } from './useCapabilityCatalog.js';
import { useAgentToolSave } from './useAgentToolSave.js';
import { Button, Field, Select, TextInput } from '../../shared/ui/primitives.js';

/** The Agent and tool configuration surface, native to the Agent product. */
export function AgentSettingsPanel({
  runtime,
  onAgentsChanged,
}: {
  readonly runtime: RuntimeInfo | null;
  readonly onAgentsChanged: () => void;
}) {
  const [selectedId, setSelectedId] = useState('');
  const settings = useAgentSettings(runtime, selectedId);
  const [name, setName] = useState('');
  const [modelReference, setModelReference] = useState('');
  const [tools, setTools] = useState<readonly string[]>([]);
  const [skills, setSkills] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const selected: Agent | null = settings.selected;
  const models = settings.models;
  const agents = settings.agents;
  const catalog = useCapabilityCatalog(selectedId, runtime);
  const saving = useAgentToolSave(onAgentsChanged);

  useEffect(() => {
    if (!selected) return;
    setName(selected.current.name);
    setModelReference(`${selected.current.providerId}:${selected.current.modelId}`);
    setTools(selected.current.grantedCapabilities.filter((g) => g.kind === 'tool').map((g) => g.name));
    setSkills(selected.current.grantedCapabilities.filter((g) => g.kind === 'skill').map((g) => g.name));
  }, [selected]);

  const toggle = (list: readonly string[], set: (value: readonly string[]) => void, value: string) => {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const save = () => {
    if (!selected) return;
    const model = models.find((entry) => entry.reference === modelReference);
    if (!model) { setError('请选择模型'); return; }
    setError(null);
    void saving.save(selected, {
      name: name.trim(), instructions: selected.current.instructions,
      providerId: model.providerId, modelId: model.modelId,
      grantedCapabilities: [
        ...tools.map((tool) => ({ kind: 'tool' as const, name: tool })),
        ...skills.map((skill) => ({ kind: 'skill' as const, name: skill })),
      ],
    });
  };

  return (
    <section className="agent-settings-agent" aria-label="Agent 与工具">
      <h3>Agent 与工具</h3>
      {(error ?? saving.error) !== null && <p role="alert">{error ?? saving.error}</p>}
      {agents.length === 0 && error === null && <p>正在读取 Agent…</p>}
      {agents.length > 0 && (
        <>
          <section className="agent-settings-card" aria-label="Agent 身份">
            <header><h4>身份</h4><p>选择要配置的 Agent，并设置它在会话中显示的名称。</p></header>
            <Field label="Agent" htmlFor="settings-agent">
              <Select id="settings-agent" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </Select>
            </Field>
            <Field label="名称" htmlFor="settings-agent-name">
              <TextInput id="settings-agent-name" value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
          </section>
          <section className="agent-settings-card" aria-label="模型">
            <header><h4>模型</h4><p>这个 Agent 新任务使用的默认模型。</p></header>
            <Field label="默认模型" htmlFor="settings-agent-model">
              <Select id="settings-agent-model" value={modelReference} onChange={(event) => setModelReference(event.target.value)}>
                {models.map((model) => <option key={model.reference} value={model.reference}>{model.displayName}</option>)}
              </Select>
            </Field>
          </section>

          <section className="agent-settings-group" role="group" aria-label="工具">
            <header>
              <h4>工具</h4>
              <p>Runtime 注册的工具。打开后这个 Agent 才能调用。</p>
            </header>
            <ul className="agent-tool-list">
              {catalog.options.tools.map((tool) => (
                <li key={tool.name} className={`agent-tool-row${tool.available ? '' : ' is-stale'}`}>
                  <span className="agent-tool-state" aria-hidden="true" />
                  <div>
                    <strong>{tool.name}</strong>
                    <small>{tool.available ? 'Runtime 已注册' : 'Runtime 未注册 · 旧授权'}</small>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={tools.includes(tool.name)}
                    aria-label={tool.name}
                    className="agent-tool-switch"
                    onClick={() => toggle(tools, setTools, tool.name)}
                  />
                </li>
              ))}
            </ul>
          </section>

          {catalog.options.skills.length > 0 && (
            <section className="agent-settings-group" role="group" aria-label="Skill">
              <header><h4>Skill</h4><p>Skill 只提供指令，不授予工具。</p></header>
              <ul className="agent-tool-list">
                {catalog.options.skills.map((skill) => (
                  <li key={skill.name} className="agent-tool-row">
                    <span className="agent-tool-state" aria-hidden="true" />
                    <div><strong>{skill.name}</strong><small>指令扩展</small></div>
                    <button type="button" role="switch" aria-checked={skills.includes(skill.name)}
                      aria-label={skill.name} className="agent-tool-switch"
                      onClick={() => toggle(skills, setSkills, skill.name)} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="agent-settings-save">
            <Button variant="primary" type="button" disabled={saving.saving} onClick={save}>{saving.saving ? '保存中…' : '保存新版本'}</Button>
          </footer>
        </>
      )}
    </section>
  );
}
