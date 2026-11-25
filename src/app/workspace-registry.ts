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
  'tasks',
]);

/** Grouped directory shown on the overview. */
export const WORKSPACE_GROUPS: readonly WorkspaceGroup[] = Object.freeze([
  {
    title: '组织与对话',
    /*
     * One assistant, one entry. Talking to the boss Agent and talking to any
     * other configured Agent were two equal navigation items, which made the
     * product read as a console with a chat feature. The organization surface
     * is the assistant; direct Agent chat is a secondary door from there.
     */
    note: '把目标交给Boss Agent；需要直接找一个 Agent 对话时，从组织台进入。',
    ids: ['organization', 'agentChat'],
    labels: { agentChat: '直接对话（次级）' },
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
