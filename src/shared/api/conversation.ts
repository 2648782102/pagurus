import { fetchJson, type RuntimeInfo } from './runtime.js';

export const CONVERSATION_CONTRACT_VERSION = '1.4.0';

export const CONVERSATION_PUBLIC_PATHS = Object.freeze([
  '/v1/organization/conversation',
  '/v1/organization/conversation/messages',
] as const);

export type ConversationMessageKind =
  | 'user_message'
  | 'boss_acknowledgement'
  | 'worker_activity'
  | 'report'
  | 'attention'
  | 'system_status';

export type ConversationMessageAuthor = 'user' | 'boss' | 'worker' | 'runtime';

export type ConversationMessageState =
  | 'published'
  | 'open'
  | 'answered'
  | 'withdrawn'
  | 'attention'
  | 'ready'
  | 'failed'
  | 'running'
  | 'succeeded';

export interface ConversationMessage {
  readonly version: typeof CONVERSATION_CONTRACT_VERSION;
  readonly id: string;
  readonly sequence: number;
  readonly kind: ConversationMessageKind;
  readonly author: ConversationMessageAuthor;
  readonly body: string;
  readonly state: ConversationMessageState;
  readonly createdByEventId: string;
  readonly projectId: string | null;
  readonly workerId: string | null;
  readonly reportId: string | null;
  readonly attentionId: string | null;
  readonly expectedVersion: number | null;
}

export interface PrimaryConversationView {
  readonly version: typeof CONVERSATION_CONTRACT_VERSION;
  readonly bossSessionId: string;
  readonly messageCount: number;
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
  readonly messages: readonly ConversationMessage[];
}

export interface ConversationMessagePage {
  readonly version: typeof CONVERSATION_CONTRACT_VERSION;
  readonly messages: readonly ConversationMessage[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVersioned(value: unknown): value is Record<string, unknown> & { version: string } {
  return isRecord(value) && value.version === CONVERSATION_CONTRACT_VERSION;
}

function boundedString(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 600;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function nullableInteger(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && (value as number) >= 1);
}

const KINDS: readonly string[] = [
  'user_message',
  'boss_acknowledgement',
  'worker_activity',
  'report',
  'attention',
  'system_status',
];
const AUTHORS: readonly string[] = ['user', 'boss', 'worker', 'runtime'];
const STATES: readonly string[] = [
  'published',
  'open',
  'answered',
  'withdrawn',
  'attention',
  'ready',
  'failed',
  'running',
  'succeeded',
];

function isMessage(value: unknown): value is ConversationMessage {
  return isVersioned(value) && isRecord(value)
    && /^msg_[0-9a-f]{24}$/.test(String(value.id))
    && Number.isInteger(value.sequence) && (value.sequence as number) >= 1
    && typeof value.kind === 'string' && KINDS.includes(value.kind)
    && typeof value.author === 'string' && AUTHORS.includes(value.author)
    && boundedString(value.body)
    && typeof value.state === 'string' && STATES.includes(value.state)
    && typeof value.createdByEventId === 'string'
    && nullableString(value.projectId)
    && nullableString(value.workerId)
    && nullableString(value.reportId)
    && nullableString(value.attentionId)
    && nullableInteger(value.expectedVersion);
}

function isPage(value: unknown): value is ConversationMessagePage {
  return isVersioned(value) && isRecord(value)
    && Array.isArray(value.messages) && value.messages.every(isMessage)
    && nullableString(value.nextCursor)
    && typeof value.hasMore === 'boolean';
}

function isView(value: unknown): value is PrimaryConversationView {
  return isPage(value) && isRecord(value)
    && typeof value.bossSessionId === 'string'
    && Number.isInteger(value.messageCount) && (value.messageCount as number) >= 0;
}

export function supportsConversationContract(runtime: RuntimeInfo | null): boolean {
  return runtime?.conversationContract === CONVERSATION_CONTRACT_VERSION
    && runtime.conversationPaths === CONVERSATION_PUBLIC_PATHS.length;
}

export async function getPrimaryConversation(signal?: AbortSignal): Promise<PrimaryConversationView> {
  const value: unknown = await fetchJson<unknown>('/v1/organization/conversation', undefined, signal);
  if (!isView(value)) throw new Error('Runtime returned an invalid primary conversation view.');
  return Object.freeze({ ...value, messages: Object.freeze(value.messages) });
}

export async function getConversationMessages(
  after?: string,
  limit = 100,
  signal?: AbortSignal,
): Promise<ConversationMessagePage> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (after) query.set('after', after);
  const value: unknown = await fetchJson<unknown>(
    `/v1/organization/conversation/messages?${query.toString()}`,
    undefined,
    signal,
  );
  if (!isPage(value)) throw new Error('Runtime returned an invalid conversation message page.');
  return Object.freeze({ ...value, messages: Object.freeze(value.messages) });
}

export function conversationMessageLabel(message: ConversationMessage): string {
  if (message.author === 'user') return '你';
  if (message.author === 'boss') return '老板 Agent';
  if (message.author === 'worker') return '员工 Agent';
  return 'Runtime';
}

export function conversationKindLabel(message: ConversationMessage): string {
  const labels: Record<ConversationMessageKind, string> = {
    user_message: '用户消息',
    boss_acknowledgement: '老板回执',
    worker_activity: '员工活动',
    report: '结构化汇报',
    attention: '需要确认',
    system_status: '执行状态',
  };
  return labels[message.kind];
}
