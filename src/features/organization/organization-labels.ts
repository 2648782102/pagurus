const EVENT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'organization.intent_recorded': '主会话意图',
  'organization.project_opened': '项目创建',
  'organization.project_activated': '项目激活',
  'organization.agent_proposed': '员工提案',
  'organization.worker_authorized': '员工授权',
  'organization.worker_execution_recorded': '工作绑定',
  'organization.worker_started': '员工启动',
  'organization.report_recorded': '结构化汇报',
  'organization.attention_requested': '请求人工输入',
  'organization.attention_answered': '人工回答',
  'organization.attention_withdrawn': '人工撤回',
  'organization.project_quieted': '项目静默',
  'organization.worker_offboarded': '员工裁撤',
  'organization.project_archived': '项目归档',
  'organization.project_resumed': '项目恢复',
  'organization.worker_resumed': '员工恢复',
  'organization.delegation_revalidated': '委派重验',
});

export function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type.replace('organization.', '');
}

export function projectStateLabel(state: string): string {
  if (state === 'archived') return '归档 · 可恢复';
  if (state === 'quiet') return '静默中';
  return state;
}
