import type { AgentChatConversation } from '../../shared/api/agent-chat.js';

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
