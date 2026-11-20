import type { AgentChatConversation } from '../../shared/api/agent-chat.js';
import type { AgentChatMessage } from '../../shared/api/agent-chat.js';

export function mergeConversation(
  previous: AgentChatConversation,
  next: AgentChatConversation,
): AgentChatConversation {
  if (previous.id !== next.id) return next;
  const byId = new Map(previous.messages.map((entry) => [entry.id, entry]));
  for (const incoming of next.messages) {
    const existing = byId.get(incoming.id);
    if (!existing || Date.parse(incoming.updatedAt) >= Date.parse(existing.updatedAt)) {
      byId.set(incoming.id, incoming);
    }
  }
  const messages = [...byId.values()].sort((left, right) => left.sequence - right.sequence);
  return { ...next, messages };
}

/*
 * Three kinds of write, because each caller knows something different.
 *
 * A command the user issued — send, approve, resume, start — replaces what is
 * on screen with what the Runtime just returned. There is nothing to preserve.
 *
 * A refresh of the conversation already open merges, because a streamed frame
 * can be newer than the snapshot the request came back with; replacing would
 * scroll a finished reply back to its first token.
 *
 * A frame arrives *from* a conversation, and the sender has no idea which one
 * is on screen. A stream cleanup runs asynchronously, so a frame from the
 * conversation the user just left can land one tick later. Accepting it would
 * silently swap the screen back to the previous conversation, which is why the
 * id has to match before anything is merged.
 */

/** Replace what is on screen with the authoritative value. */
export function replaceWith(
  next: AgentChatConversation | null,
): (previous: AgentChatConversation | null) => AgentChatConversation | null {
  return () => next;
}

/** Merge a re-read of the open conversation, keeping newer streamed messages. */
export function mergeRefresh(
  next: AgentChatConversation,
): (previous: AgentChatConversation | null) => AgentChatConversation | null {
  return (previous) => (previous === null || previous.id !== next.id
    ? next
    : mergeConversation(previous, next));
}

/** Merge a streamed snapshot, but only for the conversation on screen. */
export function applyFrame(
  snapshot: AgentChatConversation,
): (previous: AgentChatConversation | null) => AgentChatConversation | null {
  return (previous) => {
    if (previous === null) return snapshot;
    return previous.id !== snapshot.id ? previous : mergeConversation(previous, snapshot);
  };
}

/**
 * Merge one streamed message, keeping the newest body for its id.
 *
 * The sequence sort is applied to the whole list rather than an append,
 * because a message can arrive out of order after a reconnect.
 */
export function applyMessageFrame(
  incoming: AgentChatMessage,
  conversationId: string,
): (previous: AgentChatConversation | null) => AgentChatConversation | null {
  return (previous) => {
    if (previous === null || previous.id !== conversationId) return previous;
    const index = previous.messages.findIndex((entry) => entry.id === incoming.id);
    if (index >= 0
      && Date.parse(incoming.updatedAt) < Date.parse(previous.messages[index]!.updatedAt)) {
      return previous;
    }
    const messages = index >= 0
      ? previous.messages.map((entry) => (entry.id === incoming.id ? incoming : entry))
      : [...previous.messages, incoming].sort((left, right) => left.sequence - right.sequence);
    return { ...previous, messages };
  };
}
