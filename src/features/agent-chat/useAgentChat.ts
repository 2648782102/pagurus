import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createAgentChatConversation,
  getAgentChatConversation,
  isBossAgent,
  isPendingAgentChatState,
  listAgentChatAgents,
  listAgentChatModels,
  listAgentChatConversations,
  postAgentChatMessage,
  supportsAgentChat,
  type AgentChatAgent,
  type AgentChatConversation,
  type AgentChatModel,
  type AgentChatReasoningEffort,
} from '../../shared/api/agent-chat.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message.slice(0, 240) : 'Agent 对话失败';
}

export function useAgentChat(runtime: RuntimeInfo | null) {
  const supported = supportsAgentChat(runtime);
  const [agents, setAgents] = useState<readonly AgentChatAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [models, setModels] = useState<readonly AgentChatModel[]>([]);
  const [selectedModelReference, setSelectedModelReference] = useState('');
  const [reasoningEffort, setReasoningEffort] = useState<AgentChatReasoningEffort>('medium');
  const [recent, setRecent] = useState<readonly { id: string; agentId: string; lastMessagePreview: string }[]>([]);
  const [conversation, setConversation] = useState<AgentChatConversation | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const pollRef = useRef<number | null>(null);
  const conversationRef = useRef<AgentChatConversation | null>(null);
  conversationRef.current = conversation;

  const loadAgents = useCallback(async () => {
    if (!supported) return;
    try {
      const [list, catalog, history] = await Promise.all([
        listAgentChatAgents(),
        listAgentChatModels().catch(() => [] as readonly AgentChatModel[]),
        listAgentChatConversations().catch(() => null),
      ]);
      const available = list.filter((agent) => !agent.archived);
      setAgents(available);
      setModels(catalog);
      const preferred = history?.defaultModelId
        ? catalog.find((model) => model.modelId === history.defaultModelId)
        : undefined;
      setSelectedModelReference((current) => current || preferred?.reference || catalog[0]?.reference || '');
      setRecent(history?.conversations ?? []);
      if (history?.conversations[0]) {
        try {
          setConversation(await getAgentChatConversation(history.conversations[0].id));
        } catch {
          setConversation(null);
        }
      }
      setSelectedAgentId((current) => current || available.find((agent) => isBossAgent(agent))?.id
        || available.find((agent) => agent.isDefault)?.id
        || available[0]?.id || '');
      setError(null);
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [supported]);

  useEffect(() => { void loadAgents(); }, [loadAgents]);

  const refreshConversation = useCallback(async () => {
    const current = conversationRef.current;
    if (!current) return;
    try {
      setConversation(await getAgentChatConversation(current.id));
      setError(null);
    } catch (cause) {
      setError(errorText(cause));
    }
  }, []);

  useEffect(() => {
    const pending = conversation?.messages.some((message) =>
      message.author === 'assistant' && isPendingAgentChatState(message.state)) ?? false;
    if (!pending) {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    pollRef.current = window.setInterval(() => { void refreshConversation(); }, 700);
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [conversation, refreshConversation]);

  const startConversation = useCallback(async () => {
    if (!supported || !selectedAgentId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const selectedModel = models.find((model) => model.reference === selectedModelReference);
      const created = await createAgentChatConversation({
        agentId: selectedAgentId,
        reasoningEffort,
        ...(selectedModel
          ? { modelOverride: { providerId: selectedModel.providerId, modelId: selectedModel.modelId } }
          : {}),
      });
      setConversation(created);
      setDraft('');
      setDetailsOpen(false);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [busy, models, reasoningEffort, selectedAgentId, selectedModelReference, supported]);

  const resetConversation = useCallback(() => {
    setConversation(null);
    setDraft('');
    setError(null);
    setDetailsOpen(false);
  }, []);

  const sendMessage = useCallback(async () => {
    const current = conversationRef.current;
    const text = draft.trim();
    if (!current || text.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await postAgentChatMessage(current.id, {
        text,
        idempotencyKey: `pagurus-chat-${globalThis.crypto.randomUUID()}`,
      });
      setDraft('');
      setConversation(await getAgentChatConversation(current.id));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [busy, draft]);

  const activeAgent = useMemo(
    () => agents.find((agent) => agent.id === (conversation?.agentId ?? selectedAgentId)),
    [agents, conversation?.agentId, selectedAgentId],
  );
  const hasPending = conversation?.messages.some((message) =>
    message.author === 'assistant' && isPendingAgentChatState(message.state)) ?? false;

  return {
    supported,
    agents,
    models,
    selectedModelReference,
    setSelectedModelReference,
    selectedAgentId,
    setSelectedAgentId,
    conversation,
    draft,
    setDraft,
    busy,
    error,
    detailsOpen,
    setDetailsOpen,
    activeAgent,
    hasPending,
    loadAgents,
    refreshConversation,
    startConversation,
    resetConversation,
    sendMessage,
    reasoningEffort,
    setReasoningEffort,
    recent,
  };
}
