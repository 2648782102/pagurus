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
          <Field label="Agent" htmlFor="settings-agent">
            <Select id="settings-agent" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </Select>
          </Field>
          <Field label="名称" htmlFor="settings-agent-name">
            <TextInput id="settings-agent-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="模型" htmlFor="settings-agent-model">
            <Select id="settings-agent-model" value={modelReference} onChange={(event) => setModelReference(event.target.value)}>
              {models.map((model) => <option key={model.reference} value={model.reference}>{model.displayName}</option>)}
            </Select>
          </Field>

          <fieldset className="agent-settings-tools">
            <legend>工具</legend>
            <p>勾选这个 Agent 可以调用的 Runtime 工具。</p>
            <ul>
              {catalog.options.tools.map((tool) => (
                <li key={tool.name} className={tool.available ? '' : 'is-stale'}>
                  <label>
                    <input type="checkbox" checked={tools.includes(tool.name)}
                      onChange={() => toggle(tools, setTools, tool.name)} />
                    <code>{tool.name}</code>
                    {!tool.available && <small>Runtime 未注册</small>}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          {catalog.options.skills.length > 0 && (
            <fieldset className="agent-settings-tools">
              <legend>Skill</legend>
              <ul>
                {catalog.options.skills.map((skill) => (
                  <li key={skill.name}>
                    <label>
                      <input type="checkbox" checked={skills.includes(skill.name)}
                        onChange={() => toggle(skills, setSkills, skill.name)} />
                      <code>{skill.name}</code>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          <Button variant="primary" type="button" disabled={saving.saving} onClick={save}>{saving.saving ? '保存中…' : '保存新版本'}</Button>
        </>
      )}
    </section>
  );
}
