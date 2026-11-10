import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelTask,
  createTask,
  getTask,
  listModels,
  retryTask,
  type Task,
} from '../../shared/api/tasks.js';
import {
  getDefaultAgent,
  listAgents,
  listProviderModels,
  supportsAgentManagement,
  getAgent,
  type AgentRecord,
  type ProviderModel,
} from '../../shared/api/agents.js';

interface TaskModel extends ProviderModel {
  legacyId?: string;
}

export type OperationsPhase =
  | 'loading-models'
  | 'models-error'
  | 'ready'
  | 'submitting'
  | 'active'
  | 'finished';

export interface OperationsState {
  phase: OperationsPhase;
  models: readonly TaskModel[];
  selectedModel: string;
  agentMode: boolean;
  agents: readonly AgentRecord[];
  selectedAgentId: string;
  prompt: string;
  task: Task | null;
  taskAgentName: string | null;
  error: string | null;
}

const ACTIVE_STATES: readonly string[] = ['queued', 'running', 'cancelling'];

export function useTaskOperations(refreshToken = 0) {
  const [state, setState] = useState<OperationsState>({
    phase: 'loading-models',
    models: [],
    selectedModel: '',
    agentMode: false,
    agents: [],
    selectedAgentId: '',
    prompt: '',
    task: null,
    taskAgentName: null,
    error: null,
  });
  const pollingController = useRef<AbortController | null>(null);
  const selectedAgentIdRef = useRef('');
  selectedAgentIdRef.current = state.selectedAgentId;

  const loadModels = useCallback(async (signal?: AbortSignal) => {
    setState((current) => ({ ...current, phase: 'loading-models', error: null }));
    try {
      const agentMode = await supportsAgentManagement(signal);
      const [models, agents, defaultAgent] = agentMode
        ? await Promise.all([listProviderModels(signal), listAgents(signal), getDefaultAgent(signal)])
        : await listModels(signal).then((legacy) => [legacy.map((entry) => ({
          providerId: 'magpie',
          modelId: entry.id,
          reference: `magpie:${entry.id}`,
          displayName: entry.displayName,
          capabilities: ['chat'],
          legacyId: entry.id,
        })), [], null] as const);
      if (signal?.aborted) return;
      const availableAgents = agents.filter((agent) => !agent.archived);
      const initialAgent = availableAgents.find((agent) => agent.id === defaultAgent?.id);
      const retainedAgent = availableAgents.find((agent) => agent.id === selectedAgentIdRef.current);
      const preferredAgent = retainedAgent ?? initialAgent;
      const initialModel = preferredAgent
        ? models.find((model) => model.providerId === preferredAgent.current.providerId && model.modelId === preferredAgent.current.modelId)
        : models[0];
      setState((current) => ({
        ...current,
        phase: 'ready',
        models,
        agentMode,
        agents,
        selectedAgentId: availableAgents.some((agent) => agent.id === current.selectedAgentId)
          ? current.selectedAgentId
          : '',
        selectedModel: agentMode
          ? preferredAgent ? initialModel?.reference ?? '' : models[0]?.reference || ''
          : current.selectedModel || initialModel?.reference || models[0]?.reference || '',
      }));
    } catch (cause) {
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'models-error',
        error: cause instanceof Error ? cause.message : '模型目录加载失败',
      }));
    }
  }, []);

  const watchTask = useCallback(async (taskId: string, signal: AbortSignal) => {
    for (;;) {
      if (signal.aborted) return;
      try {
        const task = await getTask(taskId, signal);
        if (signal.aborted) return;
        setState((current) => ({
          ...current,
          task,
          phase: ACTIVE_STATES.includes(task.state) ? 'active' : 'finished',
          error: task.state === 'failed' && task.error ? task.error : null,
        }));
        if (!ACTIVE_STATES.includes(task.state)) return;
      } catch (cause) {
        if (signal.aborted) return;
        setState((current) => ({
          ...current,
          phase: 'finished',
          error: cause instanceof Error ? cause.message : '任务状态读取失败',
        }));
        return;
      }
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 700);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          resolve();
        }, { once: true });
      });
    }
  }, []);

  const beginWatching = useCallback((task: Task) => {
    pollingController.current?.abort();
    const controller = new AbortController();
    pollingController.current = controller;
    setState((current) => ({
      ...current,
      task,
      taskAgentName: null,
      phase: ACTIVE_STATES.includes(task.state) ? 'active' : 'finished',
      error: null,
    }));
    if (task.agentId && task.agentRevisionId) {
      void getAgent(task.agentId).then((agent) => {
        const pinned = agent.revisions.find((revision) => revision.id === task.agentRevisionId);
        if (pinned) setState((current) => current.task?.id === task.id
          ? { ...current, taskAgentName: pinned.name }
          : current);
      }).catch(() => undefined);
    }
    if (ACTIVE_STATES.includes(task.state)) void watchTask(task.id, controller.signal);
  }, [watchTask]);

  const startTask = useCallback(async () => {
    const prompt = state.prompt.trim();
    if (!state.selectedModel || !prompt || (state.agentMode && !state.selectedAgentId)) {
      setState((current) => ({ ...current, error: state.agentMode ? '请选择 Agent 和模型并输入任务内容。' : '请选择模型并输入任务内容。' }));
      return;
    }
    setState((current) => ({ ...current, phase: 'submitting', error: null, task: null }));
    try {
      const selectedModel = state.models.find((model) => model.reference === state.selectedModel);
      const selectedAgent = state.agents.find((agent) => agent.id === state.selectedAgentId);
      const task = state.agentMode
        ? await createTask({
          prompt,
          agentId: state.selectedAgentId,
          ...(selectedAgent && selectedModel
            && (selectedAgent.current.providerId !== selectedModel.providerId || selectedAgent.current.modelId !== selectedModel.modelId)
            ? { modelOverride: { providerId: selectedModel.providerId, modelId: selectedModel.modelId } }
            : {}),
        })
        : await createTask({ prompt, model: selectedModel?.legacyId ?? '' });
      beginWatching(task);
    } catch (cause) {
      setState((current) => ({
        ...current,
        phase: 'ready',
        error: cause instanceof Error ? cause.message : '任务创建失败',
      }));
    }
  }, [beginWatching, state]);

  const cancel = useCallback(async () => {
    if (!state.task) return;
    try {
      const task = await cancelTask(state.task.id);
      beginWatching(task);
    } catch (cause) {
      setState((current) => ({
        ...current,
        error: cause instanceof Error ? cause.message : '取消失败',
      }));
    }
  }, [beginWatching, state.task]);

  const retry = useCallback(async () => {
    if (!state.task) return;
    setState((current) => ({ ...current, phase: 'submitting', error: null }));
    try {
      const task = await retryTask(state.task.id);
      beginWatching(task);
    } catch (cause) {
      setState((current) => ({
        ...current,
        phase: 'finished',
        error: cause instanceof Error ? cause.message : '重试失败',
      }));
    }
  }, [beginWatching, state.task]);

  useEffect(() => {
    const controller = new AbortController();
    void loadModels(controller.signal);
    return () => {
      controller.abort();
      pollingController.current?.abort();
    };
  }, [loadModels, refreshToken]);

  return {
    ...state,
    setPrompt: (prompt: string) => setState((current) => ({ ...current, prompt })),
    setSelectedModel: (selectedModel: string) => setState((current) => ({ ...current, selectedModel })),
    setSelectedAgentId: (selectedAgentId: string) => {
      const agent = state.agents.find((entry) => entry.id === selectedAgentId);
      const model = state.models.find((entry) => entry.providerId === agent?.current.providerId && entry.modelId === agent?.current.modelId);
      setState((current) => ({ ...current, selectedAgentId, selectedModel: model?.reference ?? '' }));
    },
    loadModels: () => void loadModels(),
    startTask: () => void startTask(),
    cancel: () => void cancel(),
    retry: () => void retry(),
  };
}
