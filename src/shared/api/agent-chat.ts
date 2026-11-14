import { fetchJson, type RuntimeInfo } from './runtime.js';

export const AGENT_CHAT_CONTRACT_VERSION = '1.5.0';

export const AGENT_CHAT_PUBLIC_PATHS = Object.freeze([
  '/v1/agent-chat/agents',
  '/v1/agent-chat/conversations',
  '/v1/agent-chat/conversations/{conversationId}',
  '/v1/agent-chat/conversations/{conversationId}/messages',
] as const);

export type AgentChatMessageAuthor = 'user' | 'assistant' | 'runtime';
export type AgentChatMessageState = 'published' | 'pending' | 'succeeded' | 'failed' | 'cancelled';

export interface AgentChatAgent {
  readonly id: string;
  readonly name: string;
  readonly currentRevisionId: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly isDefault: boolean;
  readonly archived: boolean;
}

export interface AgentChatMessage {
  readonly id: string;
  readonly sequence: number;
  readonly author: AgentChatMessageAuthor;
  readonly body: string;
  readonly state: AgentChatMessageState;
  readonly taskId: string | null;
  readonly error: string | null;
}

export interface AgentChatConversation {
  readonly version: typeof AGENT_CHAT_CONTRACT_VERSION;
  readonly id: string;
  readonly agentId: string;
  readonly agentRevisionId: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly configurationRevisionId: string;
  readonly messages: readonly AgentChatMessage[];
}

export interface AgentChatMessageResult {
  readonly version: typeof AGENT_CHAT_CONTRACT_VERSION;
  readonly conversationId: string;
  readonly userMessage: AgentChatMessage;
  readonly assistantMessage: AgentChatMessage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVersioned(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.version === AGENT_CHAT_CONTRACT_VERSION;
}

function isAgent(value: unknown): value is AgentChatAgent {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.currentRevisionId === 'string'
    && typeof value.providerId === 'string'
    && typeof value.modelId === 'string'
    && typeof value.isDefault === 'boolean'
    && typeof value.archived === 'boolean';
}

const MESSAGE_STATES: readonly string[] = ['published', 'pending', 'succeeded', 'failed', 'cancelled'];
const MESSAGE_AUTHORS: readonly string[] = ['user', 'assistant', 'runtime'];

function isMessage(value: unknown): value is AgentChatMessage {
  return isRecord(value)
    && typeof value.id === 'string'
    && Number.isInteger(value.sequence) && (value.sequence as number) >= 1
    && typeof value.author === 'string' && MESSAGE_AUTHORS.includes(value.author)
    && typeof value.body === 'string'
    && typeof value.state === 'string' && MESSAGE_STATES.includes(value.state)
    && (value.taskId === null || typeof value.taskId === 'string')
    && (value.error === null || typeof value.error === 'string');
}

function isConversation(value: unknown): value is AgentChatConversation {
  return isVersioned(value)
    && typeof value.id === 'string'
    && typeof value.agentId === 'string'
    && typeof value.agentRevisionId === 'string'
    && typeof value.providerId === 'string'
    && typeof value.modelId === 'string'
    && typeof value.configurationRevisionId === 'string'
    && Array.isArray(value.messages) && value.messages.every(isMessage);
}

function isAgentList(value: unknown): value is { version: string; agents: readonly AgentChatAgent[] } {
  return isVersioned(value) && Array.isArray(value.agents) && value.agents.every(isAgent);
}

function isMessageResult(value: unknown): value is AgentChatMessageResult {
  return isVersioned(value)
    && typeof value.conversationId === 'string'
    && isMessage(value.userMessage)
    && isMessage(value.assistantMessage);
}

export function supportsAgentChat(runtime: RuntimeInfo | null): boolean {
  return runtime?.agentChatContract === AGENT_CHAT_CONTRACT_VERSION
    && runtime.agentChatPaths === AGENT_CHAT_PUBLIC_PATHS.length;
}

export async function listAgentChatAgents(signal?: AbortSignal): Promise<readonly AgentChatAgent[]> {
  const value: unknown = await fetchJson<unknown>('/v1/agent-chat/agents', undefined, signal);
  if (!isAgentList(value)) throw new Error('Runtime returned an invalid Agent Chat agent list.');
  return Object.freeze(value.agents);
}

export async function createAgentChatConversation(
  input: { agentId?: string } = {},
  signal?: AbortSignal,
): Promise<AgentChatConversation> {
  const value: unknown = await fetchJson<unknown>('/v1/agent-chat/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }, signal);
  if (!isConversation(value)) throw new Error('Runtime returned an invalid Agent Chat conversation.');
  return value;
}

export async function getAgentChatConversation(
  conversationId: string,
  signal?: AbortSignal,
): Promise<AgentChatConversation> {
  const value: unknown = await fetchJson<unknown>(
    `/v1/agent-chat/conversations/${encodeURIComponent(conversationId)}`,
    undefined,
    signal,
  );
  if (!isConversation(value)) throw new Error('Runtime returned an invalid Agent Chat conversation.');
  return value;
}

export async function postAgentChatMessage(
  conversationId: string,
  input: { text: string; idempotencyKey: string },
  signal?: AbortSignal,
): Promise<AgentChatMessageResult> {
  const value: unknown = await fetchJson<unknown>(
    `/v1/agent-chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    signal,
  );
  if (!isMessageResult(value)) throw new Error('Runtime returned an invalid Agent Chat message result.');
  return value;
}
