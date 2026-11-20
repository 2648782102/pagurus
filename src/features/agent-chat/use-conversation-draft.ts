import { useCallback, useRef, useState } from 'react';

/**
 * One draft per conversation, held for the session.
 *
 * Switching to history and back used to discard whatever was half-written,
 * which is the one loss a reader cannot undo. Each conversation keeps its own,
 * keyed by id, with `''` for the draft of a conversation that does not exist
 * yet — the composer is usable before the first message creates one.
 *
 * Memory only, on purpose: the client boundary forbids browser storage, so a
 * reload starts clean. That is a constraint, not an oversight.
 *
 * Deliberately not part of any cache or shared state. A draft is the one thing
 * whose source of truth is the client — everything else in this surface is
 * what the Runtime said — and putting it anywhere else would create the single
 * exception to that rule.
 */
export interface ConversationDraft {
  readonly draft: string;
  /** Write to the open conversation's slot. */
  readonly setDraft: (value: string) => void;
  /** Clear the slot for a conversation whose message has been sent. */
  readonly clearDraftFor: (conversationId: string) => void;
  /** Load the slot belonging to the conversation now becoming active. */
  readonly restoreDraft: (conversationId: string | null) => void;
}

export function useConversationDraft(activeConversationId: string | null): ConversationDraft {
  const [draft, setDraftState] = useState('');
  const byConversation = useRef<Map<string, string>>(new Map());
  const key = activeConversationId ?? '';

  const setDraft = useCallback((value: string) => {
    setDraftState(value);
    /* An emptied box should not leave an empty slot behind. */
    if (value.length === 0) byConversation.current.delete(key);
    else byConversation.current.set(key, value);
  }, [key]);

  const clearDraftFor = useCallback((conversationId: string) => {
    byConversation.current.delete(conversationId);
    setDraftState('');
  }, []);

  const restoreDraft = useCallback((conversationId: string | null) => {
    setDraftState(byConversation.current.get(conversationId ?? '') ?? '');
  }, []);

  return { draft, setDraft, clearDraftFor, restoreDraft };
}
