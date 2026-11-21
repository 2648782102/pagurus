import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createAgentChatConversation,
  decideAgentChatApproval,
  getAgentChatConversation,
  isPendingAgentChatState,

  postAgentChatMessage,
  supportsAgentChat,
  type AgentChatConversation,
} from '../../shared/api/agent-chat.js';
import type { RuntimeInfo } from '../../shared/api/runtime.js';
import { useVisiblePolling } from '../../shared/ui/use-poll.js';
import { defaultPermissionLevel, permissionOptionsFor } from './permission-choice.js';
import { useAgentChatStream } from './useAgentChatStream.js';
import { replaceWith } from './merge-conversation.js';
import {
  loadCatalogSnapshot,
  pickFirstAgent,
  pickModelReference,
  reconcileEffort,
  useAgentCatalog,
} from './use-agent-catalog.js';
import { useConversationDraft } from './use-conversation-draft.js';
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
  const catalog = useAgentCatalog();
  const {
    agents, selectedAgentId, models, selectedModelReference, reasoningEffort, recent,
    permissionLevel,
    setAgents, setSelectedAgentId, setModels, setSelectedModelReference, setReasoningEffort, setRecent,
    setPermissionLevel,
  } = catalog;
  const [conversation, setConversation] = useState<AgentChatConversation | null>(null);
  const { draft, setDraft: updateDraft, clearDraftFor, restoreDraft } = useConversationDraft(
    conversation?.id ?? null,
  );
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

  /*
   * What the composer's effort control currently shows.
   *
   * Kept apart from the conversation because the two are allowed to differ:
   * a reader can pick a new level while a reply is still running, and the
   * choice applies to the next message they send.
   *
   * Derived during render rather than copied into state by an effect. An
   * effect that seeds state from props runs after the first paint, so for one
   * frame the composer showed "无档位" for a conversation whose level was
   * perfectly well known — and a reader who looked at that frame saw a bug.
   * Tagging the override with the conversation it belongs to makes the
   * fallback a pure function of the current props: switching or resuming a
   * thread drops the stale choice with no bookkeeping.
   */
  const [effortChoice, setEffortChoice] = useState<{ conversationId: string | null; effort: string }>(
    { conversationId: null, effort: '' },
  );
  const conversationId = conversation?.id ?? null;
  const effortDraft: string | null = effortChoice.conversationId === conversationId
    ? effortChoice.effort
    : conversation?.reasoningEffort ?? null;
  const effortDraftRef = useRef<string | null>(effortDraft);
  effortDraftRef.current = effortDraft;

  const setEffortDraft = useCallback((effort: string) => {
    setEffortChoice({ conversationId: conversationRef.current?.id ?? null, effort });
  }, []);

  const loadAgents = useCallback(async (options: { restoreLatest?: boolean } = {}) => {
    if (!supported) return;
    try {
      const snapshot = await loadCatalogSnapshot();
      const available = snapshot.agents.filter((agent) => !agent.archived);
      setAgents(available);
      // Pick the identity in the same commit that publishes the list.
      //
      // Restoring a conversation awaits a second request below. Selecting the
      // Agent after that await left one render where the list and the
      // first-run guide were populated but `selectedAgentId` was still empty,
      // so the landing prompt claimed the Runtime returned no usable Agent and
      // disabled the input. Both reads describe one snapshot; publish them
      // together.
      setSelectedAgentId((current) => current || pickFirstAgent(available));
      setModels(snapshot.models);
      const modelReference = pickModelReference(
        snapshot.models,
        snapshot.history?.defaultModelId ?? null,
      );
      setSelectedModelReference((current) => current || modelReference);
      /*
       * Seed the effort from the model that was just selected. It starts empty
       * rather than at a constant, because which levels exist is the model's
       * answer — a Boss that runs on a `none/low/high/max` model has no
       * `medium` to start from.
       */
      setReasoningEffort((current) => reconcileEffort(
        current,
        snapshot.models.find((model) => model.reference === modelReference)?.reasoningLevels,
      ));
      setRecent(snapshot.history?.conversations ?? []);
      // Restore the newest thread that contains messages. The Runtime lists
      // newest-created first, so its head is often a conversation the user
      // opened and abandoned; resuming that would look like a broken screen.
      const resumable = options.restoreLatest
        ? snapshot.history?.conversations.find((entry) => entry.messageCount > 0)
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

  /*
   * Start the permission control at the Runtime's own level.
   *
   * Reading it rather than assuming `standard` matters: a `strict` Runtime would
   * otherwise begin on a value it clamps, so the reader's first message would
   * run under a level different from the one shown.
   */
  const runtimePermissionLevel = runtime?.permissionLevel ?? null;
  useEffect(() => {
    setPermissionLevel(defaultPermissionLevel(runtimePermissionLevel));
  }, [runtimePermissionLevel, setPermissionLevel]);

  /**
   * A Runtime notice can arrive without a user message (for example when an
   * idle project converges). While no conversation is open, SSE is not
   * connected, so the landing list needs a low-frequency refresh to show the
   * new last-message preview. An open conversation is handled by its stream.
   */
  const refreshRecent = catalog.refreshRecent;

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
        permissionLevel,
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
  }, [applyConversation, busy, models, permissionLevel, reasoningEffort, refreshRecent, restoreDraft, selectedAgentId, selectedModelReference, supported]);

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
        permissionLevel,
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
  }, [applyConversation, busy, draft, models, permissionLevel, reasoningEffort, refreshRecent, selectedAgentId, selectedModelReference, supported]);

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
      /*
       * The effort rides with the message, not with the conversation's stored
       * value, because the reader may have switched it while a reply was
       * running. The Runtime treats it as a per-turn override and adopts it as
       * the new default, so the chip and the transcript cannot drift apart.
       */
      const effort = effortDraftRef.current;
      await postAgentChatMessage(current.id, {
        text,
        idempotencyKey: `pagurus-chat-${globalThis.crypto.randomUUID()}`,
        ...(effort !== null && effort !== current.reasoningEffort ? { reasoningEffort: effort } : {}),
      });
      clearDraftFor(current.id);
      applyConversation(await getAgentChatConversation(current.id));
      void refreshRecent();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [applyConversation, busy, clearDraftFor, draft, refreshRecent]);

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

  /*
   * The levels the open conversation's model publishes.
   *
   * Read from the catalogue rather than assumed, and read through the same
   * `providerId:modelId` pair the conversation is pinned to — a conversation
   * created with a model override must consult that model, not the Agent's
   * default.
   */
  const effortLevels = useMemo(() => {
    if (conversation === null) return [] as readonly string[];
    const reference = `${conversation.providerId}:${conversation.modelId}`;
    return models.find((model) => model.reference === reference)?.reasoningLevels ?? [];
  }, [conversation, models]);

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
    effortDraft,
    setEffortDraft,
    effortLevels,
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
    permissionLevel,
    setPermissionLevel,
    /** Only the levels this Runtime allows; see `permissionOptionsFor`. */
    permissionOptions: permissionOptionsFor(runtimePermissionLevel),
    runtimePermissionLevel,
    recent,
  };
}
