import type { useAgents } from './useAgents.js';
import type { Agent } from '../../shared/api/agents.js';
import { Button, Field, Notice, Select, Tag, Textarea, TextInput } from '../../shared/ui/primitives.js';

type AgentsController = ReturnType<typeof useAgents>;

export function AgentEditor({
  agents,
  selected,
  busy,
  currentReference,
}: {
  readonly agents: AgentsController;
  readonly selected: Agent | null;
  readonly busy: boolean;
  readonly currentReference: { readonly reference: string } | undefined;
  readonly selectedAgentId?: string;
}) {
  return (
    <form className="agent-editor" onSubmit={(event) => { event.preventDefault(); agents.save(); }}>
      <div className="agent-editor-heading">
        {selected && <code>{selected.id}</code>}
        {selected && <Tag tone={selected.archived ? 'danger' : 'success'}>
          {selected.archived ? '已归档' : selected.isDefault ? '默认 Agent' : '可用'}
        </Tag>}
      </div>
      <Field label="名称" htmlFor="agent-name">
        <TextInput
          id="agent-name"
          value={agents.name}
          onChange={(event) => agents.setName(event.target.value)}
          maxLength={120}
          required
          disabled={busy || selected?.archived}
        />
      </Field>
      <Field label="Instructions" htmlFor="agent-instructions">
        <Textarea
          id="agent-instructions"
          value={agents.instructions}
          onChange={(event) => agents.setInstructions(event.target.value)}
          maxLength={20000}
          rows={6}
          placeholder="定义这个 Agent 的工作目标、语气和边界。这里的指令不会授予工具或权限。"
          disabled={busy || selected?.archived}
        />
      </Field>
      <Field label="默认模型" htmlFor="agent-model">
        <Select
          id="agent-model"
          value={agents.modelReference}
          onChange={(event) => agents.setModelReference(event.target.value)}
          disabled={busy || selected?.archived || agents.models.length === 0}
          required
        >
          {agents.models.map((model) => (
            <option key={model.reference} value={model.reference}>
              {model.displayName} · {model.providerId} / {model.modelId}
            </option>
          ))}
        </Select>
      </Field>
      {currentReference && <p className="task-hint">provider-neutral reference：<code>{currentReference.reference}</code></p>}

      <fieldset className="agent-capabilities">
        <legend>能力授权</legend>
        <p className="task-hint">
          Runtime 只允许这里列出的能力。留空表示这个 Agent 不能调用任何工具或 Skill；
          能力名必须与 Runtime 已注册的一致，未注册的条目不会生效。
        </p>
        <Field label={<>工具（每行一个，例如 <code>workspace_read</code>）</>} htmlFor="agent-tools">
          <Textarea
            id="agent-tools"
            value={agents.toolNames}
            onChange={(event) => agents.setToolNames(event.target.value)}
            rows={3}
            spellCheck={false}
            placeholder={'workspace_list\nworkspace_read'}
            disabled={busy || selected?.archived}
          />
        </Field>
        <Field label="Skill（每行一个 Skill 目录名）" htmlFor="agent-skills">
          <Textarea
            id="agent-skills"
            value={agents.skillNames}
            onChange={(event) => agents.setSkillNames(event.target.value)}
            rows={2}
            spellCheck={false}
            placeholder="release-notes"
            disabled={busy || selected?.archived}
          />
        </Field>
        {(!selected || (selected.current.grantedCapabilities?.length ?? 0) === 0)
          && agents.toolNames.trim().length === 0
          && agents.skillNames.trim().length === 0 && (
          <Notice role="status">
            当前版本未授权任何能力，该 Agent 无法调用工具或 Skill。
          </Notice>
        )}
      </fieldset>

      <div className="agent-actions">
        <Button variant="primary" type="submit" disabled={busy || !agents.models.length || selected?.archived}>
          {agents.phase === 'saving' ? '保存中…' : selected ? '保存新版本' : '创建 Agent'}
        </Button>
        {selected && !selected.archived && <>
          {!selected.isDefault && <Button type="button" onClick={agents.makeDefault} disabled={busy}>设为默认</Button>}
          {selected.isDefault && <Button type="button" onClick={agents.clearDefault} disabled={busy}>取消默认</Button>}
          <Button type="button" onClick={agents.duplicate} disabled={busy}>复制</Button>
          <Button variant="danger" type="button" onClick={agents.archive} disabled={busy}>归档</Button>
        </>}
      </div>
    </form>
  );
}
