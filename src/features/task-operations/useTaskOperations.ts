import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelTask,
  createTask,
  getTask,
  listModels,
  retryTask,
  type ModelCatalogEntry,
  type Task,
} from '../../shared/api/tasks.js';

export type OperationsPhase =
  | 'loading-models'
  | 'models-error'
  | 'ready'
  | 'submitting'
  | 'active'
  | 'finished';

export interface OperationsState {
  phase: OperationsPhase;
  models: readonly ModelCatalogEntry[];
  selectedModel: string;
  prompt: string;
  task: Task | null;
  error: string | null;
}

const ACTIVE_STATES: readonly string[] = ['queued', 'running', 'cancelling'];

export function useTaskOperations() {
  const [state, setState] = useState<OperationsState>({
    phase: 'loading-models',
    models: [],
    selectedModel: '',
    prompt: '',
    task: null,
    error: null,
  });
  const pollingController = useRef<AbortController | null>(null);

  const loadModels = useCallback(async (signal?: AbortSignal) => {
    setState((current) => ({ ...current, phase: 'loading-models', error: null }));
    try {
      const models = await listModels(signal);
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'ready',
        models,
        selectedModel: current.selectedModel || models[0]?.id || '',
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
      phase: ACTIVE_STATES.includes(task.state) ? 'active' : 'finished',
      error: null,
    }));
    if (ACTIVE_STATES.includes(task.state)) void watchTask(task.id, controller.signal);
  }, [watchTask]);

  const startTask = useCallback(async () => {
    const prompt = state.prompt.trim();
    if (!state.selectedModel || !prompt) {
      setState((current) => ({ ...current, error: '请选择模型并输入任务内容。' }));
      return;
    }
    setState((current) => ({ ...current, phase: 'submitting', error: null, task: null }));
    try {
      const task = await createTask({ prompt, model: state.selectedModel });
      beginWatching(task);
    } catch (cause) {
      setState((current) => ({
        ...current,
        phase: 'ready',
        error: cause instanceof Error ? cause.message : '任务创建失败',
      }));
    }
  }, [beginWatching, state.prompt, state.selectedModel]);

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
  }, [loadModels]);

  return {
    ...state,
    setPrompt: (prompt: string) => setState((current) => ({ ...current, prompt })),
    setSelectedModel: (selectedModel: string) => setState((current) => ({ ...current, selectedModel })),
    loadModels: () => void loadModels(),
    startTask: () => void startTask(),
    cancel: () => void cancel(),
    retry: () => void retry(),
  };
}
