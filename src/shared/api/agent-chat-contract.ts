import { isRecord, isVersioned as hasContractVersion } from './guards.js';

export const AGENT_CHAT_CONTRACT_VERSION = '1.9.0';

export const AGENT_CHAT_PUBLIC_PATHS = Object.freeze([
  '/v1/agent-chat/agents',
  '/v1/agent-chat/conversations',
  '/v1/agent-chat/conversations/{conversationId}',
  '/v1/agent-chat/conversations/{conversationId}/messages',
  '/v1/agent-chat/conversations/{conversationId}/approval',
  /*
   * Added by the Runtime alongside stop-in-flight support. It has to be listed
   * here even though this client does not call it yet: `supportsAgentChat`
   * compares the published path *count*, so a client that omits a path the
   * Runtime advertises reports the whole surface as unsupported.
   */
  '/v1/agent-chat/conversations/{conversationId}/cancel',
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
  /*
   * Finished, and the reader has not looked at it yet. The Runtime writes this
   * on a settled Boss turn and on the notices it adds to the Boss conversation
   * (a project converging or being archived), so a client that omits it will
   * meet a state it cannot name.
   */
  | 'done'
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
  /**
   * The effort tokens this model accepts, weakest first.
   *
   * Absent means the model offers no effort control; an empty array means it
   * reasons but offers no choice. Both cases mean "do not show an effort menu",
   * which is why the absence is preserved rather than normalised to a default.
   */
  readonly reasoningLevels?: readonly string[];
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
  /**
   * The model that produced this reply, as `providerId:modelId`.
   *
   * A conversation may switch models between turns, so each answer says which
   * one wrote it. `null` for a reply not produced by a model, and for messages
   * written before this field existed.
   */
  readonly modelReference?: string | null;
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

/*
 * Both predicates enumerate every state rather than defaulting.
 *
 * They used to be "terminal, else pending", which meant a state the Runtime
 * added would silently count as still generating: `done` did exactly that, and
 * the result was a poll that never stopped and a composer that kept saying a
 * reply was being written. Spelled out, the compiler names the missing case
 * when the Runtime adds one, instead of leaving it to be discovered by a
 * client burning a request every 700 ms.
 */
/*
 * `published` belongs to neither set on purpose: it is an accepted user
 * message, and its reply is a separate message. Every state has to appear in
 * one of the three places below, and the compiler enforces that — a state the
 * Runtime adds fails to compile here until someone decides which it is.
 */
const CLASSIFIED_STATES: Readonly<Record<Exclude<AgentChatMessageState, 'published'>, 'terminal' | 'pending'>> = {
  succeeded: 'terminal',
  failed: 'terminal',
  cancelled: 'terminal',
  done: 'terminal',
  unavailable: 'terminal',
  replied: 'terminal',
  pending: 'pending',
  thinking: 'pending',
  streaming: 'pending',
  organizing: 'pending',
  waiting_approval: 'pending',
  waiting_attention: 'pending',
};

export function isTerminalAgentChatState(state: AgentChatMessageState): boolean {
  return state !== 'published' && CLASSIFIED_STATES[state] === 'terminal';
}

/**
 * Whether the Runtime still owes this message something.
 *
 * `published` is a user message that has been accepted; it is neither pending
 * nor terminal, because the reply to it is a message of its own. Every other
 * state is listed above, so a new one cannot fall through by default.
 */
export function isPendingAgentChatState(state: AgentChatMessageState): boolean {
  return state !== 'published' && CLASSIFIED_STATES[state] === 'pending';
}

export interface AgentChatConversation {
  readonly version: typeof AGENT_CHAT_CONTRACT_VERSION;
  readonly id: string;
  readonly agentId: string;
  readonly agentRevisionId: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly configurationRevisionId: string;
  /**
   * The level the next turn runs at, or `null` when the model publishes none.
   * `null` is a fact about the model, not an unset field.
   */
  readonly reasoningEffort: AgentChatReasoningEffort | null;
  /**
   * The approval level actually in force for this conversation.
   *
   * Not necessarily what was requested: the Runtime clamps a request to its own
   * level, so a client that asked for `trusted` against a `standard` Runtime
   * must render `standard`. Absent on a Runtime that predates the field.
   */
  readonly permissionLevel?: AgentChatPermissionLevel;
  readonly messages: readonly AgentChatMessage[];
}

/**
 * A reasoning effort token, exactly as the model's catalog publishes it.
 *
 * Not a closed union: the gateway mixes `none/low/high/max`,
 * `low/medium/high/xhigh/ultra`, a lone `high`, and models with reasoning but
 * no published levels. A union of three could not name most of those.
 */
export type AgentChatReasoningEffort = string;
export type AgentChatPermissionLevel = 'strict' | 'standard' | 'trusted';

export interface AgentChatConversationSummary {
  readonly id: string;
  readonly agentId: string;
  readonly reasoningEffort: AgentChatReasoningEffort | null;
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
    && (value.modelReference === undefined
      || value.modelReference === null
      || typeof value.modelReference === 'string')
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
    && (value.reasoningEffort === null || typeof value.reasoningEffort === 'string')
    && (
      value.permissionLevel === undefined
      || value.permissionLevel === 'strict'
      || value.permissionLevel === 'standard'
      || value.permissionLevel === 'trusted'
    )
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
