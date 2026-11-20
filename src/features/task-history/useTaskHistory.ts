import { useEffect, useMemo, useState } from 'react';
import { listTasks, type Task, type TaskState } from '../../shared/api/tasks.js';
import { useAsyncResource } from '../../shared/ui/use-async-resource.js';

export type TaskHistoryFilter = 'all' | TaskState;

export interface TaskHistoryState {
  tasks: readonly Task[];
  activeConfigurationRevisionId: string | null;
  selectedTaskId: string;
  stateFilter: TaskHistoryFilter;
  agentFilter: string;
}

interface TaskHistoryData {
  readonly tasks: readonly Task[];
  readonly activeConfigurationRevisionId: string | null;
}

export function useTaskHistory() {
  const resource = useAsyncResource<TaskHistoryData>({
    read: async (signal) => {
      const result = await listTasks(signal);
      return { tasks: result.tasks, activeConfigurationRevisionId: result.activeConfigurationRevisionId };
    },
    failure: '任务历史加载失败',
  });
  const tasks = resource.data?.tasks ?? [];
  const activeConfigurationRevisionId = resource.data?.activeConfigurationRevisionId ?? null;

  /*
   * Selection is a view concern, not a fetch concern: it follows the visible
   * list, so filtering to another Agent or state lands on that Agent's first
   * task instead of pointing at a row that is no longer shown. Kept in local
   * state and corrected during render rather than fetched.
   */
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [stateFilter, setStateFilter] = useState<TaskHistoryFilter>('all');
  const [agentFilter, setAgentFilter] = useState('all');

  const agentIds = useMemo(() => [...new Set(tasks
    .filter((task) => task.agentId)
    .map((task) => task.agentId!))], [tasks]);
  const visibleTasks = useMemo(() => tasks.filter((task) =>
    (stateFilter === 'all' || task.state === stateFilter)
    && (agentFilter === 'all'
      || (agentFilter === 'legacy' ? task.agentId === undefined : task.agentId === agentFilter))),
  [agentFilter, stateFilter, tasks]);
  const effectiveTaskId = visibleTasks.some((task) => task.id === selectedTaskId)
    ? selectedTaskId
    : visibleTasks[0]?.id ?? '';
  const selectedTask = visibleTasks.find((task) => task.id === effectiveTaskId) ?? null;

  /* Keep the stored id in step with what is shown, so the next render agrees. */
  useEffect(() => {
    if (effectiveTaskId !== selectedTaskId) setSelectedTaskId(effectiveTaskId);
  }, [effectiveTaskId, selectedTaskId]);

  return {
    phase: resource.phase,
    error: resource.error,
    tasks,
    activeConfigurationRevisionId,
    selectedTaskId: effectiveTaskId,
    agentIds,
    visibleTasks,
    selectedTask,
    stateFilter,
    agentFilter,
    load: resource.reload,
    setSelectedTaskId,
    setStateFilter,
    setAgentFilter,
  };
}
