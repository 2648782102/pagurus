import type { Agent, ProviderModel } from '../../shared/api/agents.js';
import { Button, Field, Notice, Select, Tag, Textarea, TextInput } from '../../shared/ui/primitives.js';

export function AgentEditor({
  selected,
  models,
  name,
  instructions,
  modelReference,
  toolNames,
  skillNames,
  saving,
  busy,
  currentReference,
  onNameChange,
  onInstructionsChange,
  onModelReferenceChange,
  onToolNamesChange,
  onSkillNamesChange,
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
  readonly toolNames: string;
  readonly skillNames: string;
  readonly saving: boolean;
  readonly busy: boolean;
  readonly currentReference: { readonly reference: string } | undefined;
  readonly onNameChange: (name: string) => void;
  readonly onInstructionsChange: (instructions: string) => void;
  readonly onModelReferenceChange: (reference: string) => void;
  readonly onToolNamesChange: (names: string) => void;
  readonly onSkillNamesChange: (names: string) => void;
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
          <Field label="工具授权" hint="每行一个，例如 workspace_read。留空即禁用工具。" htmlFor="agent-tools">
            <Textarea
              id="agent-tools"
              value={toolNames}
              onChange={(event) => onToolNamesChange(event.target.value)}
              rows={4}
              spellCheck={false}
              placeholder={'workspace_list\nworkspace_read'}
              disabled={busy || selected?.archived}
            />
          </Field>
          <Field label="Skill 授权" hint="每行一个 Skill 目录名。Skill 只提供指令，不授予工具。" htmlFor="agent-skills">
            <Textarea
              id="agent-skills"
              value={skillNames}
              onChange={(event) => onSkillNamesChange(event.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="release-notes"
              disabled={busy || selected?.archived}
            />
          </Field>
        </div>
        {(!selected || (selected.current.grantedCapabilities?.length ?? 0) === 0)
          && toolNames.trim().length === 0
          && skillNames.trim().length === 0 && (
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
