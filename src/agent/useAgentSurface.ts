import { useCallback, useMemo } from 'react';
import { isBossAgent } from '../shared/api/agent-chat.js';
import type { RuntimeInfo } from '../shared/api/runtime.js';
import { useAgentChat } from '../features/agent-chat/useAgentChat.js';

/**
 * Product-surface state for the Agent app.
 *
 * The shipped product and the console share one Runtime client and one chat
 * controller. They differ in entry behaviour, not in facts:
 *
 * - The console lands on a picker so an operator explicitly chooses an Agent.
 * - The product resumes the most recent conversation on load, because a shipped
 *   app should continue where the user left off instead of asking again.
 *
 * Everything else — conversation creation, SSE, polling fallback, approval,
 * send — is the same code path. There is no second message model here.
 */
export function useAgentSurface(runtime: RuntimeInfo | null) {
  const chat = useAgentChat(runtime, { autoResume: true });
  const { recent, resetConversation } = chat;

  const activeAgent = chat.activeAgent;
  const title = activeAgent?.name ?? 'Agent';
  const isBoss = activeAgent ? isBossAgent(activeAgent) : false;

  const pinSummary = useMemo(() => {
    if (chat.conversation === null) return null;
    /*
     * The *chosen* model, not the stored one.
     *
     * These differ between picking a model and sending the message that applies
     * it, and for that gap the header said one thing while the composer said
     * another. The composer is the control, so the read-out follows it.
     */
    const [provider, ...rest] = chat.modelDraft.split(':');
    const switching = rest.length > 0;
    return {
      provider: switching ? provider : chat.conversation.providerId,
      model: switching ? rest.join(':') : chat.conversation.modelId,
      effort: chat.effortDraft ?? chat.conversation.reasoningEffort,
    };
  }, [chat.conversation, chat.modelDraft, chat.effortDraft]);

  const restart = useCallback(() => {
    resetConversation();
  }, [resetConversation]);

  // The picker lists history per Agent. Feed it only threads that contain
  // something, so an abandoned launch never becomes a "continue" affordance.
  const resumableRecent = useMemo(
    () => recent.filter((entry) => entry.messageCount > 0),
    [recent],
  );

  return {
    ...chat,
    recent: resumableRecent,
    title,
    isBoss,
    pinSummary,
    restart,
  };
}
