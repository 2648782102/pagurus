/**
 * One Boss conversation, read as work rather than as prose.
 *
 * The transcript answers "what was said". A Boss also creates projects, hires
 * workers, and receives asynchronous reports; those facts live in the
 * Runtime's organization session. This module joins the two published views so
 * the product can show one work chain inside the existing conversation without
 * parsing model text or adding another chat entry.
 */
import type { AgentChatMessage } from '../shared/api/agent-chat.js';
import type {
  OrganizationAttentionRecord,
  OrganizationSessionView,
} from '../shared/api/organization.js';
import type { AgentChatConversation } from '../shared/api/agent-chat.js';

export interface BossWorkViewInput {
  readonly conversation: AgentChatConversation | null;
  readonly session: OrganizationSessionView | null;
  readonly messages: readonly AgentChatMessage[];
}

export interface BossWorkWorkerView {
  readonly id: string;
  readonly name: string;
  readonly state: string;
  readonly reportId: string | null;
  readonly reportState: string | null;
  readonly reportDetail: string | null;
}

export interface BossWorkProjectView {
  readonly id: string;
  readonly state: string;
  readonly workers: readonly BossWorkWorkerView[];
  readonly attentionCount: number;
}

export interface BossWorkNoticeView {
  readonly id: string;
  readonly kind: 'report' | 'attention' | 'project' | 'runtime';
  readonly workerName: string | null;
  readonly state: string;
  readonly body: string;
}

export interface BossWorkAttentionView extends OrganizationAttentionRecord {
  readonly projectIdLabel: string;
  readonly workerName: string | null;
}

export interface BossWorkView {
  readonly projects: readonly BossWorkProjectView[];
  readonly notices: readonly BossWorkNoticeView[];
  readonly attention: readonly BossWorkAttentionView[];
}

const WORKER_STATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  authorized: '待启动',
  idle: '空闲',
  running: '执行中',
  reporting: '汇报中',
  blocked: '受阻',
  offboarded: '已下线',
});

const REPORT_STATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  ready: '已完成',
  failed: '失败',
});

export function bossWorkerStateLabel(state: string): string {
  return WORKER_STATE_LABELS[state] ?? state;
}

export function bossReportStateLabel(state: string): string {
  return REPORT_STATE_LABELS[state] ?? state;
}

function reportDetail(body: string): string | null {
  const match = /(?:失败|失败。|failed)[:：\s]*([\s\S]{0,240})/i.exec(body);
  const detail = (match?.[1] ?? '').trim();
  return detail.length > 0 ? detail.slice(0, 240) : null;
}

function noticeKind(body: string): BossWorkNoticeView['kind'] {
  if (/员工/.test(body) && /(?:完成|失败|取消|中断|汇报)/.test(body)) return 'report';
  if (/Attention|需要你(?:补充|确认|输入)/i.test(body)) return 'attention';
  if (/项目/.test(body)) return 'project';
  return 'runtime';
}

function noticeState(body: string): string {
  if (/失败|受阻/.test(body)) return 'failed';
  if (/完成|成功/.test(body)) return 'ready';
  if (/Attention|需要你(?:补充|确认|输入)/i.test(body)) return 'open';
  if (/执行|启动|汇报中/.test(body)) return 'running';
  return 'info';
}

function findWorkerName(body: string, session: OrganizationSessionView | null): string | null {
  for (const worker of session?.workers ?? []) {
    if (body.includes(worker.displayName) || body.includes(worker.id)) return worker.displayName;
  }
  return null;
}

export function buildBossWorkView(input: BossWorkViewInput): BossWorkView {
  const session = input.session;
  // A panel may be mounted before the first conversation loads. The work
  // itself is owned by the Organization session, not by a particular thread:
  // requiring a conversation here made the strip silently disappear from a
  // real Boss thread while its own pure projection test still passed.
  if (!session) {
    return Object.freeze({ projects: Object.freeze([]), notices: Object.freeze([]), attention: Object.freeze([]) });
  }
  const projects = session.projects.map((project): BossWorkProjectView => {
    const workers = session.workers
      .filter((worker) => worker.projectId === project.id)
      .map((worker): BossWorkWorkerView => {
        const report = [...session.reports].reverse().find((item) => item.workerId === worker.id);
        const notice = [...input.messages].reverse().find((message) =>
          message.author === 'runtime' && message.body.includes(worker.displayName));
        const body = notice?.body ?? '';
        return Object.freeze({
          id: worker.id,
          name: worker.displayName,
          state: worker.state,
          reportId: report?.id ?? null,
          reportState: report?.state ?? null,
          reportDetail: report?.state === 'failed' ? reportDetail(body) : null,
        });
      });
    return Object.freeze({
      id: project.id,
      state: project.state,
      workers: Object.freeze(workers),
      attentionCount: session.attentionRequests.filter((request) =>
        request.projectId === project.id && request.state === 'open').length,
    });
  });
  const notices = input.messages
    .filter((message) => message.author === 'runtime' && message.body.trim().length > 0)
    .map((message): BossWorkNoticeView => Object.freeze({
      id: message.id,
      kind: noticeKind(message.body),
      workerName: findWorkerName(message.body, session),
      state: noticeState(message.body),
      body: message.body.trim().slice(0, 800),
    }));
  const attention = session.attentionRequests.map((request): BossWorkAttentionView => Object.freeze({
    ...request,
    projectIdLabel: request.projectId,
    workerName: session.workers.find((worker) => worker.id === request.workerId)?.displayName ?? null,
  }));
  return Object.freeze({
    projects: Object.freeze(projects),
    notices: Object.freeze(notices),
    attention: Object.freeze(attention),
  });
}
