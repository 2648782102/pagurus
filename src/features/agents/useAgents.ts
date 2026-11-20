import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyAgentRevision,
  archiveAgent,
  createAgent,
  duplicateAgent,
  getAgent,
  setDefaultAgent,
  updateAgent,
  type Agent,
  type AgentProfile,
  type AgentRecord,
  type ProviderModel,
} from '../../shared/api/agents.js';
import { loadAgentCatalog } from '../../shared/api/agent-catalog.js';
import { errorMessage } from '../../shared/ui/errors.js';
import { grantsToDraft, parseGrantDraft, selectedModelReference } from './agent-draft.js';

export { parseGrantDraft } from './agent-draft.js';

type Phase = 'loading' | 'ready' | 'unsupported' | 'error' | 'saving';

export interface AgentEditorState {
  phase: Phase;
  supported: boolean;
  agents: readonly AgentRecord[];
  models: readonly ProviderModel[];
  selected: Agent | null;
  defaultAgentId: string | null;
  name: string;
  instructions: string;
  modelReference: string;
  toolNames: string;
  skillNames: string;
  error: string | null;
  message: string | null;
}

const initialState: AgentEditorState = {
  phase: 'loading',
  supported: false,
  agents: [],
  models: [],
  selected: null,
  defaultAgentId: null,
  name: '',
  instructions: '',
  modelReference: '',
  toolNames: '',
  skillNames: '',
  error: null,
  message: null,
};

export function useAgents(onChanged?: () => void) {
  const [state, setState] = useState<AgentEditorState>(initialState);
  const selectedIdRef = useRef<string | undefined>(undefined);
  selectedIdRef.current = state.selected?.id;

  const load = useCallback(async (signal?: AbortSignal, selectedId?: string) => {
    setState((current) => ({ ...current, phase: 'loading', error: null }));
    try {
      const catalog = await loadAgentCatalog(signal);
      if (!catalog.supportsAgents) {
        /* No Agent management: the editor has nothing to edit. */
        if (!signal?.aborted) setState((current) => ({ ...current, phase: 'unsupported', supported: false }));
        return;
      }
      const { agents, models, defaultAgentId } = catalog;
      if (signal?.aborted) return;
      /*
       * This panel opens on the Agent the reader last had, then the Runtime
       * default, then the first one. It keeps its own order rather than the
       * shared `preferredAgentId`: the editor is the one place that may need to
       * show an Agent that has just been archived, so "remembered wins" is
       * deliberate here and differs from the composer's rule.
       */
      const requestedId = selectedId ?? selectedIdRef.current;
      const selectedRecord = agents.find((agent) => agent.id === requestedId)
        ?? agents.find((agent) => agent.id === defaultAgentId && !agent.archived)
        ?? agents.find((agent) => !agent.archived)
        ?? agents[0]
        ?? null;
      const selected = selectedRecord ? await getAgent(selectedRecord.id, signal) : null;
      if (signal?.aborted) return;
      const selectedModel = selected?.current;
      setState((current) => ({
        ...current,
        phase: 'ready',
        supported: true,
        agents,
        models,
        selected,
        defaultAgentId,
        name: selectedModel?.name ?? '',
        instructions: selectedModel?.instructions ?? '',
        modelReference: selectedModelReference(models, selectedModel),
        ...grantsToDraft(selectedModel?.grantedCapabilities),
        error: null,
      }));
    } catch (cause) {
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'error',
        error: errorMessage(cause, 'Agent 列表加载失败'),
      }));
    }
  }, []);

  const refresh = useCallback((selectedId?: string) => void load(undefined, selectedId), [load]);

  const runMutation = useCallback(async (
    action: () => Promise<Agent | AgentRecord | null>,
    message: string,
    selectResult = true,
  ) => {
    setState((current) => ({ ...current, phase: 'saving', error: null, message: null }));
    try {
      const result = await action();
      const selectedId = selectResult && result && 'revisions' in result ? result.id : state.selected?.id;
      await load(undefined, selectedId);
      onChanged?.();
      setState((current) => ({ ...current, message }));
    } catch (cause) {
      setState((current) => ({
        ...current,
        phase: 'ready',
        error: errorMessage(cause, 'Agent 操作失败'),
      }));
    }
  }, [load, onChanged, state.selected?.id]);

  const profile = (): AgentProfile | null => {
    const model = state.models.find((entry) => entry.reference === state.modelReference);
    if (!model || !state.name.trim()) return null;
    return {
      name: state.name.trim(),
      instructions: state.instructions,
      providerId: model.providerId,
      modelId: model.modelId,
      grantedCapabilities: parseGrantDraft(state.toolNames, state.skillNames),
    };
  };

  const save = useCallback(() => {
    let next: AgentProfile | null;
    try {
      next = profile();
    } catch (cause) {
      setState((current) => ({
        ...current,
        error: errorMessage(cause, '能力授权格式无效。'),
      }));
      return;
    }
    if (!next) {
      setState((current) => ({ ...current, error: '请填写 Agent 名称并选择可用模型。' }));
      return;
    }
    if (state.selected) {
      void runMutation(
        () => updateAgent(state.selected!.id, state.selected!.currentRevisionId, next),
        '已保存为新的不可变版本。',
      );
    } else {
      void runMutation(() => createAgent(next), 'Agent 已创建。');
    }
  }, [runMutation, state]);

  const select = useCallback((agentId: string) => refresh(agentId), [refresh]);
  const duplicate = useCallback(() => {
    if (state.selected) void runMutation(() => duplicateAgent(state.selected!.id), '已创建 Agent 副本。');
  }, [runMutation, state.selected]);
  const archive = useCallback(() => {
    if (state.selected && window.confirm(`归档「${state.selected.current.name}」？历史版本和任务记录会保留。`)) {
      void runMutation(() => archiveAgent(state.selected!.id), 'Agent 已归档。', false);
    }
  }, [runMutation, state.selected]);
  const makeDefault = useCallback(() => {
    if (state.selected) void runMutation(() => setDefaultAgent(state.selected!.id), '默认 Agent 已更新。', false);
  }, [runMutation, state.selected]);
  const clearDefault = useCallback(() => {
    void runMutation(() => setDefaultAgent(null), '已清除默认 Agent。', false);
  }, [runMutation]);
  const rollback = useCallback((revisionId: string) => {
    if (state.selected) {
      void runMutation(
        () => applyAgentRevision(state.selected!.id, revisionId, state.selected!.currentRevisionId),
        '已从历史版本创建新的当前版本。',
      );
    }
  }, [runMutation, state.selected]);
  const startNew = useCallback(() => setState((current) => ({
    ...current,
    selected: null,
    name: '',
    instructions: '',
    modelReference: current.models[0]?.reference ?? '',
    toolNames: '',
    skillNames: '',
    message: null,
    error: null,
  })), []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return {
    ...state,
    setName: (name: string) => setState((current) => ({ ...current, name })),
    setInstructions: (instructions: string) => setState((current) => ({ ...current, instructions })),
    setModelReference: (modelReference: string) => setState((current) => ({ ...current, modelReference })),
    setToolNames: (toolNames: string) => setState((current) => ({ ...current, toolNames })),
    setSkillNames: (skillNames: string) => setState((current) => ({ ...current, skillNames })),
    refresh,
    select,
    startNew,
    save,
    duplicate,
    archive,
    makeDefault,
    clearDefault,
    rollback,
  };
}
