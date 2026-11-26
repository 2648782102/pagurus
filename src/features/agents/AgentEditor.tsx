import type { Agent, ProviderModel } from '../../shared/api/agents.js';
import { Button, Field, Notice, Select, Tag, Textarea, TextInput } from '../../shared/ui/primitives.js';
import type { CapabilityOption } from './agent-capability-catalog.js';

export function AgentEditor({
  selected,
  models,
  name,
  instructions,
  modelReference,
  toolOptions,
  skillOptions,
  selectedTools,
  selectedSkills,
  onToggleTool,
  onToggleSkill,
  saving,
  busy,
  currentReference,
  onNameChange,
  onInstructionsChange,
  onModelReferenceChange,
  onSave,
  onMakeDefault,
  onClearDefault,
  onDuplicate,
  onArchive,
}: {
  readonly selected: Agent | null;
  readonly models: readonly ProviderModel[];
  readonly name: string;
  readonly instructions: string;
  readonly modelReference: string;
  readonly toolOptions: readonly CapabilityOption[];
  readonly skillOptions: readonly CapabilityOption[];
  readonly selectedTools: ReadonlySet<string>;
  readonly selectedSkills: ReadonlySet<string>;
  readonly saving: boolean;
  readonly busy: boolean;
  readonly currentReference: { readonly reference: string } | undefined;
  readonly onNameChange: (name: string) => void;
  readonly onInstructionsChange: (instructions: string) => void;
  readonly onModelReferenceChange: (reference: string) => void;
  readonly onToggleTool: (name: string) => void;
  readonly onToggleSkill: (name: string) => void;
  readonly onSave: () => void;
  readonly onMakeDefault: () => void;
  readonly onClearDefault: () => void;
  readonly onDuplicate: () => void;
  readonly onArchive: () => void;
}) {
  return (
    <form className="agent-editor" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <div className="agent-editor-heading">
        {selected && <code>{selected.id}</code>}
        {selected && <Tag tone={selected.archived ? 'danger' : 'success'}>
          {selected.archived ? '已归档' : selected.isDefault ? '默认 Agent' : '可用'}
        </Tag>}
      </div>
      <Field label="名称" htmlFor="agent-name">
        <TextInput
          id="agent-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          maxLength={120}
          required
          disabled={busy || selected?.archived}
        />
      </Field>
      <Field label="Instructions" htmlFor="agent-instructions">
        <Textarea
          id="agent-instructions"
          value={instructions}
          onChange={(event) => onInstructionsChange(event.target.value)}
          maxLength={20000}
          rows={6}
          placeholder="定义这个 Agent 的工作目标、语气和边界。这里的指令不会授予工具或权限。"
          disabled={busy || selected?.archived}
        />
      </Field>
      <Field label="默认模型" htmlFor="agent-model">
        <Select
          id="agent-model"
          value={modelReference}
          onChange={(event) => onModelReferenceChange(event.target.value)}
          disabled={busy || selected?.archived || models.length === 0}
          required
        >
          {models.map((model) => (
            <option key={model.reference} value={model.reference}>
              {model.displayName} · {model.providerId} / {model.modelId}
            </option>
          ))}
        </Select>
      </Field>
      {currentReference && <p className="task-hint">provider-neutral reference：<code>{currentReference.reference}</code></p>}

      <fieldset className="agent-capabilities config-form-surface">
        <legend>能力授权</legend>
        <p className="task-hint agent-capabilities-note">
          Runtime 只允许这里列出的能力。留空表示这个 Agent 不能调用任何工具或 Skill；
          能力名必须与 Runtime 已注册的一致，未注册的条目不会生效。
        </p>
        <div className="agent-capability-grid">
          <fieldset className="agent-tool-list">
            <legend>工具授权</legend>
            <p className="task-hint">勾选这个 Agent 可以调用的 Runtime 工具。未勾选即不可调用。</p>
            {toolOptions.length === 0 ? <p className="task-hint">Runtime 没有注册任何工具。</p> : (
              <ul>
                {toolOptions.map((tool) => (
                  <li key={tool.name} className={tool.available ? '' : 'is-stale'}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedTools.has(tool.name)}
                        onChange={() => onToggleTool(tool.name)}
                        disabled={busy || selected?.archived}
                      />
                      <code>{tool.name}</code>
                      {!tool.available && <small>Runtime 未注册</small>}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
          <fieldset className="agent-tool-list">
            <legend>Skill 授权</legend>
            <p className="task-hint">Skill 只提供指令，不授予工具。</p>
            {skillOptions.length === 0 ? <p className="task-hint">没有可授权的 Skill。</p> : (
              <ul>
                {skillOptions.map((skill) => (
                  <li key={skill.name} className={skill.available ? '' : 'is-stale'}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedSkills.has(skill.name)}
                        onChange={() => onToggleSkill(skill.name)}
                        disabled={busy || selected?.archived}
                      />
                      <code>{skill.name}</code>
                      {!skill.available && <small>Runtime 未注册</small>}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        </div>
        {selectedTools.size === 0 && selectedSkills.size === 0 && (
          <Notice role="status">
            当前版本未授权任何能力，该 Agent 无法调用工具或 Skill。
          </Notice>
        )}
      </fieldset>

      <div className="agent-actions">
        <Button variant="primary" type="submit" disabled={busy || !models.length || selected?.archived}>
          {saving ? '保存中…' : selected ? '保存新版本' : '创建 Agent'}
        </Button>
        {selected && !selected.archived && <>
          {!selected.isDefault && <Button type="button" onClick={onMakeDefault} disabled={busy}>设为默认</Button>}
          {selected.isDefault && <Button type="button" onClick={onClearDefault} disabled={busy}>取消默认</Button>}
          <Button type="button" onClick={onDuplicate} disabled={busy}>复制</Button>
          <Button variant="danger" type="button" onClick={onArchive} disabled={busy}>归档</Button>
        </>}
      </div>
    </form>
  );
}
