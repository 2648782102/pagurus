import type { AgentChatMessage } from '../../shared/api/agent-chat.js';

/**
 * The user messages that were asked while an earlier reply was still being
 * written.
 *
 * The Runtime accepts a second message mid-generation by starting its own task
 * (`tests/agent-chat-concurrent.test.ts` asserts exactly that, and the composer
 * says so: "正在等待回复；你可以继续写下一条"). Each task is given the
 * transcript as it stood when it was asked, so the two replies are written
 * without knowledge of each other and land side by side. Read as one exchange,
 * that says something false about what each reply knew.
 *
 * Which turns were concurrent is recoverable from published fields alone, so it
 * survives a reload: a reply cannot have finished before the question asked
 * after it was accepted. If an assistant message's `updatedAt` is later than a
 * following user message's `updatedAt`, that user message arrived while the
 * reply was still being generated.
 *
 * `updatedAt` moves as a message streams, so the comparison is against the
 * reply's *last* update — exactly what is needed: it is later than the question
 * only if the reply was still changing when the question arrived.
 */
export function concurrentTurnIds(messages: readonly AgentChatMessage[]): ReadonlySet<string> {
  const concurrent = new Set<string>();
  for (const [index, message] of messages.entries()) {
    if (message.author !== 'user') continue;
    const askedAt = Date.parse(message.updatedAt);
    if (Number.isNaN(askedAt)) continue;
    for (const earlier of messages.slice(0, index)) {
      if (earlier.author !== 'assistant') continue;
      const stillWriting = Date.parse(earlier.updatedAt) > askedAt;
      if (stillWriting) {
        concurrent.add(message.id);
        break;
      }
    }
  }
  return concurrent;
}

/**
 * The reply that was still being written when a concurrent turn was asked.
 *
 * The nearest earlier assistant message is the one that was in flight: an
 * earlier reply that had already finished would have an `updatedAt` before the
 * question, and so would not have marked this turn concurrent at all.
 */
export function blockingReply(
  messages: readonly AgentChatMessage[],
  userMessageId: string,
): AgentChatMessage | null {
  const index = messages.findIndex((message) => message.id === userMessageId);
  if (index < 0) return null;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = messages[cursor]!;
    if (candidate.author === 'assistant') return candidate;
  }
  return null;
}
