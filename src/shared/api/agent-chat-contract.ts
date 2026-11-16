import { isRecord, isVersioned as hasContractVersion } from './guards.js';

export const AGENT_CHAT_CONTRACT_VERSION = '1.8.0';

export const AGENT_CHAT_PUBLIC_PATHS = Object.freeze([
  '/v1/agent-chat/agents',
  '/v1/agent-chat/conversations',
  '/v1/agent-chat/conversations/{conversationId}',
  '/v1/agent-chat/conversations/{conversationId}/messages',
  '/v1/agent-chat/conversations/{conversationId}/approval',
  '/v1/agent-chat/conversations/{conversationId}/events',
] as const);

export const BOSS_AGENT_ID = 'boss-agent';

export function isBossAgent(agent: Pick<AgentChatAgent, 'id' | 'providerId' | 'modelId'>): boolean {
  return agent.id === BOSS_AGENT_ID
    && agent.providerId === 'runtime'
    && agent.modelId === '组织编排';
}

export type AgentChatMessageAuthor = 'user' | 'assistant' | 'runtime';
export type AgentChatMessageState =
  | 'published'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'thinking'
  | 'streaming'
  | 'organizing'
  | 'waiting_approval'
  | 'waiting_attention'
  | 'replied'
  | 'unavailable';

export type AgentChatMessagePhase =
  | 'accepted'
  | 'preparing'
  | 'model'
  | 'organization'
  | 'human'
  | 'terminal';

export interface AgentChatAgent {
  readonly id: string;
  readonly name: string;
  readonly currentRevisionId: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly isDefault: boolean;
  readonly archived: boolean;
}

export interface AgentChatModel {
  readonly providerId: string;
  readonly modelId: string;
  readonly reference: string;
  readonly displayName: string;
}

export interface AgentChatMessage {
  readonly id: string;
  readonly sequence: number;
  readonly author: AgentChatMessageAuthor;
  readonly body: string;
  readonly state: AgentChatMessageState;
  readonly taskId: string | null;
  readonly error: string | null;
  readonly phase: AgentChatMessagePhase;
  readonly progress: number | null;
  readonly updatedAt: string;
  readonly replyToId: string | null;
  readonly activity: readonly AgentChatActivity[];
}

export type AgentChatActivityKind = 'turn' | 'tool' | 'approval' | 'output';
export type AgentChatActivityState = 'running' | 'succeeded' | 'failed' | 'waiting_approval';

export interface AgentChatActivity {
  readonly id: string;
  readonly kind: AgentChatActivityKind;
  readonly label: string;
  readonly state: AgentChatActivityState;
  readonly detail: string | null;
}

export function isTerminalAgentChatState(state: AgentChatMessageState): boolean {
  return state === 'replied'
    || state === 'succeeded'
    || state === 'failed'
    || state === 'cancelled'
    || state === 'unavailable';
}

export function isPendingAgentChatState(state: AgentChatMessageState): boolean {
  return !isTerminalAgentChatState(state) && state !== 'published';
}

export interface AgentChatConversation {
  readonly version: typeof AGENT_CHAT_CONTRACT_VERSION;
  readonly id: string;
  readonly agentId: string;
  readonly agentRevisionId: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly configurationRevisionId: string;
  readonly reasoningEffort: AgentChatReasoningEffort;
  readonly messages: readonly AgentChatMessage[];
}

export type AgentChatReasoningEffort = 'low' | 'medium' | 'high';

export interface AgentChatConversationSummary {
  readonly id: string;
  readonly agentId: string;
  readonly reasoningEffort: AgentChatReasoningEffort;
  readonly createdAt: string;
  readonly messageCount: number;
  readonly lastMessagePreview: string;
}

export interface AgentChatConversationList {
  readonly version: typeof AGENT_CHAT_CONTRACT_VERSION;
  readonly conversations: readonly AgentChatConversationSummary[];
  readonly defaultModelId: string | null;
}

export interface AgentChatMessageResult {
  readonly version: typeof AGENT_CHAT_CONTRACT_VERSION;
  readonly conversationId: string;
  readonly userMessage: AgentChatMessage;
  readonly assistantMessage: AgentChatMessage;
}

export interface AgentChatApprovalResult {
  readonly version: typeof AGENT_CHAT_CONTRACT_VERSION;
  readonly conversationId: string;
  readonly assistantMessage: AgentChatMessage;
}

export interface AgentChatStreamFrame {
  readonly version: typeof AGENT_CHAT_CONTRACT_VERSION;
  readonly conversationId: string;
  readonly kind: 'snapshot' | 'message' | 'health';
  readonly eventId: string | null;
  readonly messageId: string | null;
  readonly message: AgentChatMessage | null;
  readonly conversation: AgentChatConversation | null;
}

function isVersioned(value: unknown): value is Record<string, unknown> {
  return hasContractVersion(value, AGENT_CHAT_CONTRACT_VERSION);
}

export function isAgentChatAgent(value: unknown): value is AgentChatAgent {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.currentRevisionId === 'string'
    && typeof value.providerId === 'string'
    && typeof value.modelId === 'string'
    && typeof value.isDefault === 'boolean'
    && typeof value.archived === 'boolean';
}

const MESSAGE_STATES: readonly string[] = [
  'published', 'pending', 'succeeded', 'failed', 'cancelled',
  'thinking', 'streaming', 'organizing', 'waiting_approval', 'waiting_attention', 'replied', 'unavailable',
];
const MESSAGE_AUTHORS: readonly string[] = ['user', 'assistant', 'runtime'];
const MESSAGE_PHASES: readonly string[] = [
  'accepted', 'preparing', 'model', 'organization', 'human', 'terminal',
];

export function isAgentChatMessage(value: unknown): value is AgentChatMessage {
  return isRecord(value)
    && typeof value.id === 'string'
    && Number.isInteger(value.sequence) && (value.sequence as number) >= 1
    && typeof value.author === 'string' && MESSAGE_AUTHORS.includes(value.author)
    && typeof value.body === 'string'
    && typeof value.state === 'string' && MESSAGE_STATES.includes(value.state)
    && (value.taskId === null || typeof value.taskId === 'string')
    && (value.error === null || typeof value.error === 'string')
    && typeof value.phase === 'string' && MESSAGE_PHASES.includes(value.phase)
    && (value.progress === null || (Number.isInteger(value.progress)
      && (value.progress as number) >= 0 && (value.progress as number) <= 100))
    && typeof value.updatedAt === 'string'
    && (value.replyToId === null || typeof value.replyToId === 'string')
    && Array.isArray(value.activity) && value.activity.every(isAgentChatActivity);
}

const ACTIVITY_KINDS: readonly string[] = ['turn', 'tool', 'approval', 'output'];
const ACTIVITY_STATES: readonly string[] = ['running', 'succeeded', 'failed', 'waiting_approval'];

export function isAgentChatActivity(value: unknown): value is AgentChatActivity {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.label === 'string'
    && typeof value.kind === 'string' && ACTIVITY_KINDS.includes(value.kind)
    && typeof value.state === 'string' && ACTIVITY_STATES.includes(value.state)
    && (value.detail === null || typeof value.detail === 'string');
}

export function isAgentChatConversation(value: unknown): value is AgentChatConversation {
  return isVersioned(value)
    && typeof value.id === 'string'
    && typeof value.agentId === 'string'
    && typeof value.agentRevisionId === 'string'
    && typeof value.providerId === 'string'
    && typeof value.modelId === 'string'
    && typeof value.configurationRevisionId === 'string'
    && (value.reasoningEffort === 'low' || value.reasoningEffort === 'medium' || value.reasoningEffort === 'high')
    && Array.isArray(value.messages) && value.messages.every(isAgentChatMessage);
}

export function isAgentChatAgentList(
  value: unknown,
): value is { version: string; agents: readonly AgentChatAgent[] } {
  return isVersioned(value) && Array.isArray(value.agents) && value.agents.every(isAgentChatAgent);
}

export function isAgentChatMessageResult(value: unknown): value is AgentChatMessageResult {
  return isVersioned(value)
    && typeof value.conversationId === 'string'
    && isAgentChatMessage(value.userMessage)
    && isAgentChatMessage(value.assistantMessage);
}

export function isAgentChatApprovalResult(value: unknown): value is AgentChatApprovalResult {
  return isVersioned(value)
    && typeof value.conversationId === 'string'
    && isAgentChatMessage(value.assistantMessage);
}

export function isAgentChatStreamFrame(value: unknown): value is AgentChatStreamFrame {
  return isVersioned(value)
    && typeof value.conversationId === 'string'
    && (value.kind === 'snapshot' || value.kind === 'message' || value.kind === 'health')
    && (value.eventId === null || typeof value.eventId === 'string')
    && (value.messageId === null || typeof value.messageId === 'string')
    && (value.message === null || isAgentChatMessage(value.message))
    && (value.conversation === null || isAgentChatConversation(value.conversation));
}
