import { useEffect, useRef, useState } from 'react';

export type WorkspaceId =
  | 'overview'
  | 'organization'
  | 'agentChat'
  | 'execution'
  | 'agents'
  | 'tasks'
  | 'work'
  | 'capabilities'
  | 'secrets'
  | 'settings';

export interface WorkspaceDefinition {
  readonly id: WorkspaceId;
  readonly label: string;
  readonly section: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly href: string;
  readonly hint: string;
  readonly aliases: readonly string[];
}

export const WORKSPACES: readonly WorkspaceDefinition[] = [
  {
    id: 'overview',
    label: '总览',
    section: '本机控制台',
    title: '控制台总览',
    description: '一处看清 Runtime 连接、全部已开放工作区，以及配置与执行的边界。',
    icon: '⌂',
    href: '#overview',
    hint: '连接状态与快速入口',
    aliases: ['', 'page-title', 'runtime-title', 'next-title', 'workspace-content'],
  },
  {
    id: 'organization',
    label: '组织主会话',
    section: '组织台',
    title: '单一主会话组织台',
    description: '提交用户意图，attention-first 查看项目、员工委派、工作项、结构化汇报与归档证据；所有状态只来自 Runtime。',
    icon: '◎',
    href: '#organization-console',
    hint: '主意图、Attention 与项目审计',
    aliases: ['organization', 'organization-console', 'organization-title'],
  },
  {
    id: 'agentChat',
    label: 'Agent 对话',
    section: '直接对话',
    title: 'Agent 对话工作区',
    description: '选择一个配置好的 Agent 并进行普通聊天；模型与供应商配置由用户在 Magpie 中完成，Runtime 只负责协议接入与执行。',
    icon: '✦',
    href: '#agent-chat',
    hint: '配置 Agent 一问一答',
    aliases: ['agent-chat', 'agent-chat-title', 'chat'],
  },
  {
    id: 'execution',
    label: '受控执行',
    section: '执行审计',
    title: '受控执行工作台',
    description: '通过显式授权、审批、撤销和摘要审计管理 1.2.0 假执行器；能力记录本身不代表授权或执行。',
    icon: '✓',
    href: '#execution-console',
    hint: '授权、审批、撤销与审计',
    aliases: ['execution', 'execution-console', 'execution-title'],
  },
  {
    id: 'agents',
    label: 'Agent 配置',
    section: '定义 Agent',
    title: 'Agent 工作区',
    description: '管理独立身份、不可变版本、默认模型与历史对比；任务会在执行时固定这里选定的版本。',
    icon: '◉',
    href: '#agent-panel',
    hint: '身份、版本与默认模型',
    aliases: ['agents', 'agent-title', 'agents-title'],
  },
  {
    id: 'tasks',
    label: '任务运行',
    section: '运行与回看',
    title: '任务工作区',
    description: '提交一轮模型任务，观察流式进度、取消或重试，并读取任务历史中的固定版本证据。',
    icon: '↗',
    href: '#task-operations-title',
    hint: '运行一次任务与任务历史',
    aliases: ['tasks', 'task-history', 'task-history-title'],
  },
  {
    id: 'work',
    label: '持久工作',
    section: '工作控制',
    title: '持久工作控制台',
    description: '通过已发布的控制路由启动、停止、完成和恢复工作项，查看交付决策与有界事件证据。',
    icon: '≋',
    href: '#workbench-title',
    hint: '工作项、恢复与交付证据',
    aliases: ['work', 'workbench'],
  },
  {
    id: 'capabilities',
    label: '能力目录',
    section: '配置记录',
    title: '能力与扩展记录',
    description: '登记 MCP、Skill、插件和句柄的配置元数据；记录只是数据，不安装代码也不授予权限。',
    icon: '⌘',
    href: '#capability-title',
    hint: 'MCP、Skill、插件元数据',
    aliases: ['capabilities', 'capability-title'],
  },
  {
    id: 'secrets',
    label: '敏感信息',
    section: '只写句柄',
    title: '只写敏感信息',
    description: '集中提交一次性句柄值、轮换与状态变更；界面只保留 key、元数据和摘要收据，绝不回读明文。',
    icon: '✳',
    href: '#secrets-title',
    hint: '只写提交、轮换与收据',
    aliases: ['secrets', 'secrets-title'],
  },
  {
    id: 'settings',
    label: '运行时设置',
    section: '全局策略',
    title: '运行时策略',
    description: '校验、应用与回滚一份独立的 v1/v2 全局配置版本；这是运行时策略，不是 Agent profile。',
    icon: '⚙',
    href: '#configuration-title',
    hint: '版本化配置与回滚',
    aliases: ['settings', 'runtime-settings'],
  },
];

function normalizeHash(value: string): string {
  return value.replace(/^#/, '').toLowerCase();
}

export function resolveWorkspace(hash: string): WorkspaceDefinition {
  const normalized = normalizeHash(hash);
  return WORKSPACES.find((workspace) =>
    normalizeHash(workspace.href) === normalized || workspace.aliases.includes(normalized))
    ?? WORKSPACES[0];
}

export function useWorkspace() {
  const [active, setActive] = useState<WorkspaceId>(() => resolveWorkspace(window.location.hash).id);
  const [scrollTarget, setScrollTarget] = useState('');
  const isFirstRender = useRef(true);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      setActive(resolveWorkspace(hash).id);
      setScrollTarget(normalizeHash(hash));
    };
    window.addEventListener('hashchange', sync);
    sync();
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const main = document.getElementById('workspace-content');
    const target = scrollTarget ? document.getElementById(scrollTarget) : null;
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'start' });
    } else {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    main?.focus({ preventScroll: true });
  }, [active, scrollTarget]);

  return {
    active,
    current: WORKSPACES.find((workspace) => workspace.id === active) ?? WORKSPACES[0],
    workspaces: WORKSPACES,
  };
}
