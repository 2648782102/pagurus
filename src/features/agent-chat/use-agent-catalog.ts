import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import {
  listAgentChatAgents,
  listAgentChatConversations,
  listAgentChatModels,
  isBossAgent,
  type AgentChatAgent,
  type AgentChatConversationSummary,
  type AgentChatModel,
  type AgentChatReasoningEffort,
} from '../../shared/api/agent-chat.js';

/**
 * The choices a new conversation is made from: which Agent, which model, how
 * hard it should think, and what was open recently.
 *
 * This is the half of the chat controller that never changes while a
 * conversation is running. It is read once at startup and again when the
 * reader picks something; nothing here depends on a reply.
 *
 * The setters are exposed because the startup read publishes both halves in
 * one pass — see `useAgentChat`. Hiding them would force that read into this
 * hook, which would make the catalogue depend on the conversation.
 */
export interface AgentCatalogState {
  readonly agents: readonly AgentChatAgent[];
  readonly selectedAgentId: string;
  readonly models: readonly AgentChatModel[];
  readonly selectedModelReference: string;
  readonly reasoningEffort: AgentChatReasoningEffort;
  readonly recent: readonly AgentChatConversationSummary[];
  /*
   * `SetStateAction`, not a plain value: the startup read picks a default only
   * when nothing is chosen yet, which is a function of the previous value. A
   * value-only setter would make that read clobber a choice made in between.
   */
  readonly setAgents: Dispatch<SetStateAction<readonly AgentChatAgent[]>>;
  readonly setSelectedAgentId: Dispatch<SetStateAction<string>>;
  readonly setModels: Dispatch<SetStateAction<readonly AgentChatModel[]>>;
  readonly setSelectedModelReference: Dispatch<SetStateAction<string>>;
  readonly setReasoningEffort: Dispatch<SetStateAction<AgentChatReasoningEffort>>;
  readonly setRecent: Dispatch<SetStateAction<readonly AgentChatConversationSummary[]>>;
  /** Re-read the history list; never surfaces a failure. */
  readonly refreshRecent: () => void;
}

export function useAgentCatalog(): AgentCatalogState {
  const [agents, setAgents] = useState<readonly AgentChatAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [models, setModels] = useState<readonly AgentChatModel[]>([]);
  const [selectedModelReference, setSelectedModelReference] = useState('');
  const [reasoningEffort, setReasoningEffort] = useState<AgentChatReasoningEffort>('medium');
  const [recent, setRecent] = useState<readonly AgentChatConversationSummary[]>([]);

  /*
   * A history refresh is opportunistic: it fills the landing list with the
   * last-message preview, and a failure means the list is stale, not that the
   * conversation is broken. Never surfaced as a chat error.
   */
  const refreshRecent = useCallback(() => {
    void (async () => {
      try {
        const history = await listAgentChatConversations();
        setRecent(history.conversations);
      } catch {
        /* stale is acceptable; wrong is not */
      }
    })();
  }, []);

  return {
    agents,
    selectedAgentId,
    models,
    selectedModelReference,
    reasoningEffort,
    recent,
    setAgents,
    setSelectedAgentId,
    setModels,
    setSelectedModelReference,
    setReasoningEffort,
    setRecent,
    refreshRecent,
  };
}

/*
 * Both of these are pure lookups, so they stay module functions rather than
 * hook callbacks: returned from the hook they would be new on every render,
 * and the startup read depends on them.
 */

/** The Boss is the Agent a reader almost always means, then the default. */
export function pickFirstAgent(list: readonly AgentChatAgent[]): string {
  return list.find((agent) => isBossAgent(agent))?.id
    ?? list.find((agent) => agent.isDefault)?.id
    ?? list[0]?.id
    ?? '';
}

/** The Runtime's default model if it is offered, otherwise the first. */
export function pickModelReference(
  catalog: readonly AgentChatModel[],
  defaultModelId: string | null,
): string {
  const preferred = defaultModelId
    ? catalog.find((model) => model.modelId === defaultModelId)
    : undefined;
  return preferred?.reference ?? catalog[0]?.reference ?? '';
}

/** The three reads a startup needs, settled together. */
export function loadCatalogSnapshot(): Promise<{
  readonly agents: readonly AgentChatAgent[];
  readonly models: readonly AgentChatModel[];
  readonly history: {
    readonly conversations: readonly AgentChatConversationSummary[];
    readonly defaultModelId: string | null;
  } | null;
}> {
  return Promise.all([
    listAgentChatAgents(),
    listAgentChatModels().catch(() => [] as readonly AgentChatModel[]),
    listAgentChatConversations().catch(() => null),
  ]).then(([agents, models, history]) => ({ agents, models, history }));
}
