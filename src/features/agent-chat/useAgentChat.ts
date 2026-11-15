import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createAgentChatConversation,
  decideAgentChatApproval,
  getAgentChatConversation,
  isBossAgent,
  isPendingAgentChatState,
  listAgentChatAgents,
  listAgentChatModels,
  listAgentChatConversations,
  openAgentChatStream,
  postAgentChatMessage,
  supportsAgentChat,
  type AgentChatAgent,
  type AgentChatConversation,
  type AgentChatConversationSummary,
  type AgentChatModel,
  type AgentChatReasoningEffort,
  type AgentChatStream,
} from '../../shared/api/agent-chat.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { mergeConversation } from './merge-conversation.js';

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
  const [recent, setRecent] = useState<readonly AgentChatConversationSummary[]>([]);
  const [conversation, setConversation] = useState<AgentChatConversation | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamStalled, setStreamStalled] = useState(false);
  const lastFrameAtRef = useRef(0);
  const [streamAttempt, setStreamAttempt] = useState(0);
  const pollRef = useRef<number | null>(null);
  const streamRef = useRef<AgentChatStream | null>(null);
  const conversationRef = useRef<AgentChatConversation | null>(null);
  conversationRef.current = conversation;

  const loadAgents = useCallback(async (options: { restoreLatest?: boolean } = {}) => {
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
      // The landing panel is the default entry point, so a conversation is only
      // restored when the caller explicitly asks for it.
      if (options.restoreLatest && history?.conversations[0]) {
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
    if (!pending || (streamConnected && !streamStalled)) {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    pollRef.current = window.setInterval(() => { void refreshConversation(); }, 700);
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [conversation, refreshConversation, streamConnected, streamStalled]);

  useEffect(() => {
    const pending = conversation?.messages.some((message) =>
      message.author === 'assistant' && isPendingAgentChatState(message.state)) ?? false;
    if (!streamConnected || !pending) {
      setStreamStalled(false);
      return;
    }
    const timer = window.setInterval(() => {
      if (Date.now() - lastFrameAtRef.current > 45_000) setStreamStalled(true);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [streamConnected, conversation]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshConversation();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshConversation]);

  useEffect(() => {
    streamRef.current?.close();
    streamRef.current = null;
    setStreamConnected(false);
    setStreamAttempt(0);
    if (!supported || !conversation || typeof EventSource === 'undefined') return;
    const current = conversation;
    let closed = false;
    const stream = openAgentChatStream(current.id, null, {
      onReconnect: (_cursor, attempt) => {
        setStreamConnected(false);
        setStreamAttempt(attempt);
      },
      onFrame: (frame) => {
        if (closed) return;
        setStreamConnected(true);
        setStreamStalled(false);
        lastFrameAtRef.current = Date.now();
        setStreamAttempt(0);
        if (frame.kind === 'snapshot' && frame.conversation) {
          const snapshot = frame.conversation;
          setConversation((previous) => {
            if (previous && previous.id !== snapshot.id) return previous;
            return previous ? mergeConversation(previous, snapshot) : snapshot;
          });
          return;
        }
        if (frame.kind !== 'message' || !frame.message) return;
        const incoming = frame.message;
        setConversation((previous) => {
          if (!previous || previous.id !== current.id) return previous;
          const index = previous.messages.findIndex((entry) => entry.id === incoming.id);
          if (index >= 0) {
            const existing = previous.messages[index]!;
            if (Date.parse(incoming.updatedAt) < Date.parse(existing.updatedAt)) return previous;
          }
          const messages = index >= 0
            ? previous.messages.map((entry) => entry.id === incoming.id ? incoming : entry)
            : [...previous.messages, incoming].sort((left, right) => left.sequence - right.sequence);
          return { ...previous, messages };
        });
      },
    });
    streamRef.current = stream;
    return () => {
      closed = true;
      stream.close();
      setStreamConnected(false);
      if (streamRef.current === stream) streamRef.current = null;
    };
  }, [conversation?.id, supported]);

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

  /**
   * Opens an existing conversation from the history list. Selecting history is
   * an explicit act, so this is the only place a previous conversation becomes
   * active after the landing panel has rendered.
   */
  const resumeConversation = useCallback(async (conversationId: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setConversation(await getAgentChatConversation(conversationId));
      setDraft('');
      setDetailsOpen(false);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [busy]);

  /**
   * Choosing an Agent on the landing panel scopes the history list to that
   * Agent without starting a conversation.
   */
  const selectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    setError(null);
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

  const decideApproval = useCallback(async (
    assistantMessageId: string,
    decision: 'approved' | 'rejected',
  ) => {
    const current = conversationRef.current;
    if (!current || busy) return;
    setBusy(true);
    setError(null);
    try {
      await decideAgentChatApproval(current.id, { assistantMessageId, decision });
      setConversation(await getAgentChatConversation(current.id));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [busy]);

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
    streamConnected,
    streamStalled,
    streamAttempt,
    loadAgents,
    refreshConversation,
    startConversation,
    resetConversation,
    resumeConversation,
    selectAgent,
    sendMessage,
    decideApproval,
    reasoningEffort,
    setReasoningEffort,
    recent,
  };
}
