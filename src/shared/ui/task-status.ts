import type { TaskState } from '../api/tasks.js';

/** The single presentation vocabulary for the published TaskState contract. */
export const TASK_STATE_LABELS: Readonly<Record<TaskState, string>> = Object.freeze({
  queued: '排队中',
  running: '模型运行中',
  cancelling: '正在取消',
  succeeded: '已完成',
  failed: '失败',
  cancelled: '已取消',
  interrupted: '进程中断',
  waiting_approval: '等待审批',
});

export const TASK_STATE_FILTERS: readonly { readonly value: TaskState; readonly label: string }[] = Object.freeze(
  (Object.entries(TASK_STATE_LABELS) as [TaskState, string][]).map(([value, label]) => ({ value, label })),
);

const ACTIVE_TASK_STATES: readonly TaskState[] = Object.freeze(['queued', 'running', 'cancelling']);

export function isActiveTaskState(state: TaskState | undefined): boolean {
  return state !== undefined && ACTIVE_TASK_STATES.includes(state);
}
