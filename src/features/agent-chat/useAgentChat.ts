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
  postAgentChatMessage,
  supportsAgentChat,
  type AgentChatAgent,
  type AgentChatConversation,
  type AgentChatConversationSummary,
  type AgentChatModel,
  type AgentChatReasoningEffort,
} from '../../shared/api/agent-chat.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { useVisiblePolling } from '../../shared/ui/use-poll.js';
import { useAgentChatStream } from './useAgentChatStream.js';
import { replaceWith } from './merge-conversation.js';
import { errorMessage } from '../../shared/ui/errors.js';

function errorText(cause: unknown): string {
  return errorMessage(cause, 'Agent 对话失败');
}

/**
 * `autoResume` decides what an initial load means:
 * - `false` (console): land on the picker; an operator chooses explicitly.
 * - `true` (product): continue the newest thread that actually has messages.
 *
 * Both share one load path, so there is no second request and no race between
 * "load the catalog" and "resume something".
 */
export function useAgentChat(
  runtime: RuntimeInfo | null,
  options: { readonly autoResume?: boolean } = {},
) {
  const autoResume = options.autoResume ?? false;
  const supported = supportsAgentChat(runtime);
  const [agents, setAgents] = useState<readonly AgentChatAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [models, setModels] = useState<readonly AgentChatModel[]>([]);
  const [selectedModelReference, setSelectedModelReference] = useState('');
  const [reasoningEffort, setReasoningEffort] = useState<AgentChatReasoningEffort>('medium');
  const [recent, setRecent] = useState<readonly AgentChatConversationSummary[]>([]);
  const [conversation, setConversation] = useState<AgentChatConversation | null>(null);
  const [draft, setDraft] = useState('');
  /*
   * A draft belongs to the conversation it was written in.
   *
   * Switching to history and back used to discard whatever was half-written,
   * which is the one loss a reader cannot undo. Kept in memory only: the
   * client boundary forbids browser storage, so a reload still starts empty.
   * The key is the conversation id, or '' for the not-yet-created draft.
   */
  const draftsByConversation = useRef<Map<string, string>>(new Map());
  const draftKey = conversation?.id ?? '';

  const updateDraft = useCallback((value: string) => {
    setDraft(value);
    if (value.length === 0) draftsByConversation.current.delete(draftKey);
    else draftsByConversation.current.set(draftKey, value);
  }, [draftKey]);

  /** Restore the draft that belongs to the conversation now becoming active. */
  const restoreDraft = useCallback((conversationId: string | null) => {
    setDraft(draftsByConversation.current.get(conversationId ?? '') ?? '');
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  /*
   * Every write to `conversation` goes through here, so the rules about what
   * counts as a replacement live in one place. These are all command results:
   * the Runtime just told us what the conversation is, so it replaces.
   * Streamed frames reach a different entry point that will not accept a
   * foreign id, and a refresh of the open conversation merges instead.
   */
  const applyConversation = useCallback((next: AgentChatConversation | null) => {
    setConversation(replaceWith(next));
  }, []);

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
      // Pick the identity in the same commit that publishes the list.
      //
      // Restoring a conversation awaits a second request below. Selecting the
      // Agent after that await left one render where the list and the
      // first-run guide were populated but `selectedAgentId` was still empty,
      // so the landing prompt claimed the Runtime returned no usable Agent and
      // disabled the input. Both reads describe one snapshot; publish them
      // together.
      setSelectedAgentId((current) => current || available.find((agent) => isBossAgent(agent))?.id
        || available.find((agent) => agent.isDefault)?.id
        || available[0]?.id || '');
      setModels(catalog);
      const preferred = history?.defaultModelId
        ? catalog.find((model) => model.modelId === history.defaultModelId)
        : undefined;
      setSelectedModelReference((current) => current || preferred?.reference || catalog[0]?.reference || '');
      setRecent(history?.conversations ?? []);
      // Restore the newest thread that contains messages. The Runtime lists
      // newest-created first, so its head is often a conversation the user
      // opened and abandoned; resuming that would look like a broken screen.
      const resumable = options.restoreLatest
        ? history?.conversations.find((entry) => entry.messageCount > 0)
        : undefined;
      if (resumable) {
        try {
          applyConversation(await getAgentChatConversation(resumable.id));
        } catch {
          applyConversation(null);
        }
      }
      setError(null);
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [applyConversation, supported]);

  useEffect(() => { void loadAgents({ restoreLatest: autoResume }); }, [autoResume, loadAgents]);

  /**
   * A Runtime notice can arrive without a user message (for example when an
   * idle project converges). While no conversation is open, SSE is not
   * connected, so the landing list needs a low-frequency refresh to show the
   * new last-message preview. An open conversation is handled by its stream.
   */
  const refreshRecent = useCallback(async () => {
    if (!supported) return;
    try {
      const history = await listAgentChatConversations();
      setRecent(history.conversations);
    } catch {
      // A history refresh is opportunistic: never surface it as a chat error.
    }
  }, [supported]);

  useVisiblePolling(
    () => refreshRecent(),
    15_000,
    supported && conversation === null,
  );

  const {
    streamConnected,
    streamStalled,
    streamAttempt,
    refreshConversation,
  } = useAgentChatStream({
    conversation,
    supported,
    setConversation,
    onError: (message) => setError(message),
  });

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
      applyConversation(created);
      restoreDraft(created.id);
      setDetailsOpen(false);
      void refreshRecent();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [applyConversation, busy, models, reasoningEffort, refreshRecent, restoreDraft, selectedAgentId, selectedModelReference, supported]);

  const resetConversation = useCallback(() => {
    applyConversation(null);
    restoreDraft(null);
    setError(null);
    setDetailsOpen(false);
  }, [applyConversation, restoreDraft]);

  /**
   * Start a conversation and immediately say the first thing.
   *
   * A product entry screen collects a message and then opens the thread, so
   * separating "open" from "send" would leave an empty conversation on screen
   * whenever the send failed. This keeps one user action to one outcome.
   */
  const startAndSend = useCallback(async () => {
    const text = draft.trim();
    if (!supported || !selectedAgentId || busy || text.length === 0) return;
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
      await postAgentChatMessage(created.id, {
        text,
        idempotencyKey: `pagurus-chat-${globalThis.crypto.randomUUID()}`,
      });
      applyConversation(await getAgentChatConversation(created.id));
      restoreDraft(created.id);
      setDetailsOpen(false);
      void refreshRecent();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [applyConversation, busy, draft, models, reasoningEffort, refreshRecent, selectedAgentId, selectedModelReference, supported]);

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
      applyConversation(await getAgentChatConversation(conversationId));
      restoreDraft(conversationId);
      setDetailsOpen(false);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [applyConversation, busy]);

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
      draftsByConversation.current.delete(current.id);
      setDraft('');
      applyConversation(await getAgentChatConversation(current.id));
      void refreshRecent();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [applyConversation, busy, draft, refreshRecent]);

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
      applyConversation(await getAgentChatConversation(current.id));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [applyConversation, busy]);

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
    setDraft: updateDraft,
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
    startAndSend,
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
