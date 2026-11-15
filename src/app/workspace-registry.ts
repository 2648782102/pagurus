import type { WorkspaceId } from './useWorkspace.js';

export interface WorkspaceGroup {
  readonly title: string;
  readonly note: string;
  readonly ids: readonly WorkspaceId[];
  /** Short label used when the directory differs from the navigation label. */
  readonly labels?: Readonly<Partial<Record<WorkspaceId, string>>>;
}

/** Explicit quick-entry order. It is presentation data, not navigation state. */
export const QUICK_STARTS: readonly WorkspaceId[] = Object.freeze([
  'organization',
  'agentChat',
  'tasks',
]);

/** Grouped directory shown on the overview. */
export const WORKSPACE_GROUPS: readonly WorkspaceGroup[] = Object.freeze([
  {
    title: '组织与对话',
    note: '把目标交给老板 Agent，或直接与一个配置好的 Agent 对话。',
    ids: ['organization', 'agentChat'],
  },
  {
    title: '运行与审计',
    note: '查看任务、持久工作与每一次受控执行的证据。',
    ids: ['tasks', 'work', 'execution'],
  },
  {
    title: '构建与管理',
    note: '维护 Agent 版本、运行时策略、能力记录与只写句柄。',
    ids: ['agents', 'settings', 'capabilities', 'secrets'],
    labels: { settings: '运行时配置' },
  },
]);
