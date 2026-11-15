import { useEffect, useState } from 'react';
import { useAgents } from './useAgents.js';
import { AgentEditor } from './AgentEditor.js';
import { AgentPicker } from './AgentPicker.js';
import { AgentRevisionHistory } from './AgentRevisionHistory.js';
import { earliestRevision } from './agent-revisions.js';
import { Button, EmptyState, Notice, Section } from '../../shared/ui/primitives.js';

export function AgentWorkspace({ onAgentsChanged }: { onAgentsChanged?: () => void }) {
  const agents = useAgents(onAgentsChanged);
  const selected = agents.selected;
  const [creating, setCreating] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState('');
  const [compareRightId, setCompareRightId] = useState('');
  const busy = agents.phase === 'saving' || agents.phase === 'loading';
  const currentReference = agents.models.find((model) => model.reference === agents.modelReference);
  const defaultCompareLeftId = selected?.currentRevisionId ?? '';
  const defaultCompareRightId = selected ? earliestRevision(selected.revisions)?.id ?? selected.currentRevisionId : '';

  useEffect(() => {
    if (selected) setCreating(false);
    if (!selected) {
      setCompareLeftId('');
      setCompareRightId('');
      return;
    }
    setCompareLeftId(selected.currentRevisionId);
    setCompareRightId(earliestRevision(selected.revisions)?.id ?? selected.currentRevisionId);
  }, [selected?.currentRevisionId, selected?.id, selected?.revisions.length]);

  const startNewAgent = () => {
    setCreating(true);
    agents.startNew();
  };

  return (
    <Section
      className="agent-panel"
      id="agent-title"
      title="Agent 配置"
      description={agents.supported
        ? `${agents.agents.length} 个配置 · 选择身份后编辑内容或创建新版本`
        : undefined}
    >
      {agents.phase === 'loading' && <p className="task-hint" role="status">正在读取 Runtime Agent 和模型目录…</p>}
      {agents.phase === 'unsupported' && (
        <Notice tone="warning" title="当前 Runtime 未开放 Agent 管理">
          任务运行和全局配置仍可照常使用。连接支持 agents 与 provider-neutral-model-catalog 能力的 Conchbase 后，此处即可管理 Agent。
        </Notice>
      )}
      {agents.phase === 'error' && (
        <Notice tone="danger" action={<Button size="sm" type="button" onClick={() => agents.refresh()}>重新加载</Button>}>
          {agents.error}
        </Notice>
      )}

      {agents.supported && (
        <>
          <AgentPicker
            agents={agents.agents}
            selectedAgentId={selected?.id}
            busy={busy}
            onSelect={(agentId) => {
              setCreating(false);
              agents.select(agentId);
            }}
            onStartNew={startNewAgent}
          />
          {agents.models.length === 0 && <Notice tone="warning">Runtime 当前没有可选择的模型。</Notice>}
          {!selected && agents.agents.length === 0 && (
            <EmptyState
              tone="compact"
              title="还没有 Agent。"
              description="点击「新建 Agent」后填写名称、指令和默认模型；保存时会创建第一个不可变版本。"
              action={<Button variant="primary" type="button" disabled={busy || agents.models.length === 0}
                onClick={startNewAgent}>开始配置第一个 Agent</Button>}
            />
          )}
          {(!selected && !creating) ? null : (
          <AgentEditor
            selected={selected}
            models={agents.models}
            name={agents.name}
            instructions={agents.instructions}
            modelReference={agents.modelReference}
            toolNames={agents.toolNames}
            skillNames={agents.skillNames}
            saving={agents.phase === 'saving'}
            busy={busy}
            currentReference={currentReference}
            onNameChange={agents.setName}
            onInstructionsChange={agents.setInstructions}
            onModelReferenceChange={agents.setModelReference}
            onToolNamesChange={agents.setToolNames}
            onSkillNamesChange={agents.setSkillNames}
            onSave={agents.save}
            onMakeDefault={agents.makeDefault}
            onClearDefault={agents.clearDefault}
            onDuplicate={agents.duplicate}
            onArchive={agents.archive}
          />
          )}
          <AgentRevisionHistory
            selected={selected}
            busy={busy}
            compareLeftId={compareLeftId}
            compareRightId={compareRightId}
            defaultCompareLeftId={defaultCompareLeftId}
            defaultCompareRightId={defaultCompareRightId}
            onLeftChange={setCompareLeftId}
            onRightChange={setCompareRightId}
            onRollback={agents.rollback}
          />
          {agents.message && <p className="config-message" role="status">{agents.message}</p>}
          {agents.error && <Notice tone="danger" action={
            agents.error.includes('重新加载') || agents.error.includes('Agent 已被其他操作更新')
              ? <Button size="sm" type="button" onClick={() => agents.refresh(selected?.id)}>重新加载当前版本</Button>
              : undefined
          }>{agents.error}</Notice>}
        </>
      )}
    </Section>
  );
}
