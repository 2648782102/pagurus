import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyAgentRevision,
  archiveAgent,
  createAgent,
  duplicateAgent,
  getAgent,
  getDefaultAgent,
  listAgents,
  listProviderModels,
  setDefaultAgent,
  supportsAgentManagement,
  updateAgent,
  type Agent,
  type AgentProfile,
  type AgentRecord,
  type ProviderModel,
} from '../../shared/api/agents.js';

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
  error: null,
  message: null,
};

function selectedModelReference(models: readonly ProviderModel[], revision: Agent['current'] | undefined): string {
  if (!revision) return models[0]?.reference ?? '';
  return models.find((model) => model.providerId === revision.providerId && model.modelId === revision.modelId)?.reference ?? '';
}

export function useAgents(onChanged?: () => void) {
  const [state, setState] = useState<AgentEditorState>(initialState);
  const selectedIdRef = useRef<string | undefined>(undefined);
  selectedIdRef.current = state.selected?.id;

  const load = useCallback(async (signal?: AbortSignal, selectedId?: string) => {
    setState((current) => ({ ...current, phase: 'loading', error: null }));
    try {
      if (!await supportsAgentManagement(signal)) {
        if (!signal?.aborted) setState((current) => ({ ...current, phase: 'unsupported', supported: false }));
        return;
      }
      const [agents, models, defaultAgent] = await Promise.all([
        listAgents(signal), listProviderModels(signal), getDefaultAgent(signal),
      ]);
      if (signal?.aborted) return;
      const requestedId = selectedId ?? selectedIdRef.current;
      const selectedRecord = agents.find((agent) => agent.id === requestedId)
        ?? agents.find((agent) => agent.id === defaultAgent?.id && !agent.archived)
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
        defaultAgentId: defaultAgent?.id ?? null,
        name: selectedModel?.name ?? '',
        instructions: selectedModel?.instructions ?? '',
        modelReference: selectedModelReference(models, selectedModel),
        error: null,
      }));
    } catch (cause) {
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'error',
        error: cause instanceof Error ? cause.message : 'Agent 列表加载失败',
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
        error: cause instanceof Error ? cause.message : 'Agent 操作失败',
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
    };
  };

  const save = useCallback(() => {
    const next = profile();
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
