import {
  AGENT_CHAT_CONTRACT_VERSION,
  AGENT_CHAT_PUBLIC_PATHS,
  isAgentChatAgentList,
  isAgentChatApprovalResult,
  isAgentChatConversation,
  isAgentChatMessageResult,
  isBossAgent,
  type AgentChatAgent,
  type AgentChatApprovalResult,
  type AgentChatConversation,
  type AgentChatConversationList,
  type AgentChatMessageResult,
  type AgentChatModel,
  type AgentChatReasoningEffort,
} from './agent-chat-contract.js';
import { isRecord } from './guards.js';
import { jsonBody, requestJson } from './http.js';
import type { RuntimeInfo } from './runtime.js';

export function supportsAgentChat(runtime: RuntimeInfo | null): boolean {
  return runtime?.agentChatContract === AGENT_CHAT_CONTRACT_VERSION
    && runtime.agentChatPaths === AGENT_CHAT_PUBLIC_PATHS.length;
}

function isAgentChatModel(value: unknown): value is AgentChatModel {
  return isRecord(value)
    && typeof value.providerId === 'string'
    && typeof value.modelId === 'string'
    && typeof value.reference === 'string'
    && typeof value.displayName === 'string';
}

function isAgentChatModelCatalog(value: unknown): value is { models: AgentChatModel[] } {
  return isRecord(value) && Array.isArray(value.models) && value.models.every(isAgentChatModel);
}

function isAgentChatConversationList(value: unknown): value is AgentChatConversationList {
  return isRecord(value)
    && value.version === AGENT_CHAT_CONTRACT_VERSION
    && Array.isArray(value.conversations)
    && value.conversations.every((entry) => isRecord(entry)
      && typeof entry.id === 'string'
      && typeof entry.agentId === 'string'
      && typeof entry.createdAt === 'string'
      && Number.isInteger(entry.messageCount)
      && typeof entry.lastMessagePreview === 'string')
    && (value.defaultModelId === null || typeof value.defaultModelId === 'string');
}

export async function listAgentChatAgents(signal?: AbortSignal): Promise<readonly AgentChatAgent[]> {
  const value = await requestJson('/v1/agent-chat/agents', isAgentChatAgentList, {
    signal,
    invalidPayload: () => new Error('Runtime returned an invalid Agent Chat agent list.'),
  });
  return Object.freeze([...value.agents].sort((left, right) =>
    Number(isBossAgent(right)) - Number(isBossAgent(left))));
}

export async function listAgentChatModels(signal?: AbortSignal): Promise<readonly AgentChatModel[]> {
  const value = await requestJson('/v1/model-catalog', isAgentChatModelCatalog, {
    signal,
    invalidPayload: () => new Error('Runtime returned an invalid Agent Chat model catalog.'),
  });
  return Object.freeze([...value.models]);
}

export function createAgentChatConversation(
  input: {
    readonly agentId?: string;
    readonly modelOverride?: { readonly providerId: string; readonly modelId: string };
    readonly reasoningEffort?: AgentChatReasoningEffort;
  } = {},
  signal?: AbortSignal,
): Promise<AgentChatConversation> {
  return requestJson('/v1/agent-chat/conversations', isAgentChatConversation, {
    method: 'POST',
    body: jsonBody(input),
    signal,
    invalidPayload: () => new Error('Runtime returned an invalid Agent Chat conversation.'),
  });
}

export function listAgentChatConversations(
  limit = 20,
  signal?: AbortSignal,
): Promise<AgentChatConversationList> {
  return requestJson(
    `/v1/agent-chat/conversations?limit=${encodeURIComponent(String(limit))}`,
    isAgentChatConversationList,
    { signal, invalidPayload: () => new Error('Runtime returned an invalid Agent Chat conversation list.') },
  );
}

export function getAgentChatConversation(
  conversationId: string,
  signal?: AbortSignal,
): Promise<AgentChatConversation> {
  return requestJson(
    `/v1/agent-chat/conversations/${encodeURIComponent(conversationId)}`,
    isAgentChatConversation,
    { signal, invalidPayload: () => new Error('Runtime returned an invalid Agent Chat conversation.') },
  );
}

export function postAgentChatMessage(
  conversationId: string,
  input: {
    text: string;
    idempotencyKey: string;
    /**
     * Overrides the conversation's level for this one turn, and becomes the
     * conversation's new default. Omit it to keep what the chip shows.
     */
    reasoningEffort?: AgentChatReasoningEffort;
    /**
     * Switches the conversation to another model for this turn and every turn
     * after it. Omit it to keep the current one.
     */
    modelOverride?: { readonly providerId: string; readonly modelId: string };
  },
  signal?: AbortSignal,
): Promise<AgentChatMessageResult> {
  return requestJson(
    `/v1/agent-chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    isAgentChatMessageResult,
    {
      method: 'POST',
      body: jsonBody(input),
      signal,
      invalidPayload: () => new Error('Runtime returned an invalid Agent Chat message result.'),
    },
  );
}

export function decideAgentChatApproval(
  conversationId: string,
  input: { readonly assistantMessageId: string; readonly decision: 'approved' | 'rejected' },
  signal?: AbortSignal,
): Promise<AgentChatApprovalResult> {
  return requestJson(
    `/v1/agent-chat/conversations/${encodeURIComponent(conversationId)}/approval`,
    isAgentChatApprovalResult,
    {
      method: 'POST',
      body: jsonBody(input),
      signal,
      invalidPayload: () => new Error('Runtime returned an invalid Agent Chat approval result.'),
    },
  );
}
