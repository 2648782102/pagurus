import { useCallback, useEffect, useMemo, useState } from 'react';
import { listTasks, type Task, type TaskState } from '../../shared/api/tasks.js';

export type TaskHistoryPhase = 'loading' | 'ready' | 'error';
export type TaskHistoryFilter = 'all' | TaskState;

export interface TaskHistoryState {
  phase: TaskHistoryPhase;
  tasks: readonly Task[];
  activeConfigurationRevisionId: string | null;
  selectedTaskId: string;
  stateFilter: TaskHistoryFilter;
  agentFilter: string;
  error: string | null;
}

const initialState: TaskHistoryState = {
  phase: 'loading',
  tasks: [],
  activeConfigurationRevisionId: null,
  selectedTaskId: '',
  stateFilter: 'all',
  agentFilter: 'all',
  error: null,
};

export function useTaskHistory() {
  const [state, setState] = useState<TaskHistoryState>(initialState);

  const load = useCallback(async (signal?: AbortSignal) => {
    setState((current) => ({ ...current, phase: 'loading', error: null }));
    try {
      const result = await listTasks(signal);
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'ready',
        tasks: result.tasks,
        activeConfigurationRevisionId: result.activeConfigurationRevisionId,
        selectedTaskId: result.tasks.some((task) => task.id === current.selectedTaskId)
          ? current.selectedTaskId
          : result.tasks[0]?.id ?? '',
        error: null,
      }));
    } catch (cause) {
      if (signal?.aborted) return;
      setState((current) => ({
        ...current,
        phase: 'error',
        error: cause instanceof Error ? cause.message : '任务历史加载失败',
      }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const agentIds = useMemo(() => [...new Set(state.tasks
    .filter((task) => task.agentId)
    .map((task) => task.agentId!))], [state.tasks]);
  const visibleTasks = useMemo(() => state.tasks.filter((task) =>
    (state.stateFilter === 'all' || task.state === state.stateFilter)
    && (state.agentFilter === 'all'
      || (state.agentFilter === 'legacy' ? task.agentId === undefined : task.agentId === state.agentFilter))),
  [state.agentFilter, state.stateFilter, state.tasks]);
  const selectedTaskId = visibleTasks.some((task) => task.id === state.selectedTaskId)
    ? state.selectedTaskId
    : visibleTasks[0]?.id ?? '';
  const selectedTask = visibleTasks.find((task) => task.id === selectedTaskId) ?? null;

  return {
    ...state,
    selectedTaskId,
    agentIds,
    visibleTasks,
    selectedTask,
    load: () => void load(),
    setSelectedTaskId: (selectedTaskId: string) => setState((current) => ({ ...current, selectedTaskId })),
    setStateFilter: (stateFilter: TaskHistoryFilter) => setState((current) => ({ ...current, stateFilter })),
    setAgentFilter: (agentFilter: string) => setState((current) => ({ ...current, agentFilter })),
  };
}
