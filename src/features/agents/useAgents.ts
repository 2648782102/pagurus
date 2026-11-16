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
  type CapabilityGrant,
  type ProviderModel,
} from '../../shared/api/agents.js';
import { errorMessage } from '../../shared/ui/errors.js';

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

const CAPABILITY_NAME = /^[a-z0-9][a-z0-9_.-]{0,119}$/;
const MAX_CAPABILITY_GRANTS = 64;

function grantsToDraft(grants: readonly CapabilityGrant[] | undefined): { toolNames: string; skillNames: string } {
  const namesOf = (kind: CapabilityGrant['kind']) => (grants ?? [])
    .filter((grant) => grant.kind === kind)
    .map((grant) => grant.name)
    .join('\n');
  return { toolNames: namesOf('tool'), skillNames: namesOf('skill') };
}

export function parseGrantDraft(toolNames: string, skillNames: string): CapabilityGrant[] {
  const parse = (kind: CapabilityGrant['kind'], draft: string): CapabilityGrant[] => {
    const seen = new Set<string>();
    const grants: CapabilityGrant[] = [];
    for (const raw of draft.split(/[\s,]+/)) {
      const name = raw.trim();
      if (name.length === 0) continue;
      if (!CAPABILITY_NAME.test(name)) throw new Error(`能力名「${name}」不符合 Runtime 命名规则。`);
      if (seen.has(name)) throw new Error(`能力「${name}」重复出现。`);
      seen.add(name);
      grants.push({ kind, name });
    }
    return grants;
  };
  const grants = [...parse('tool', toolNames), ...parse('skill', skillNames)];
  if (grants.length > MAX_CAPABILITY_GRANTS) {
    throw new Error(`一个 Agent 最多可授权 ${MAX_CAPABILITY_GRANTS} 项能力。`);
  }
  return grants;
}

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
