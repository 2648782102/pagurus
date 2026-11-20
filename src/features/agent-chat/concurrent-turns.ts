import type { AgentChatMessage } from '../../shared/api/agent-chat.js';

/**
 * Whether a message is a reply the Agent produced for a question.
 *
 * Not every `assistant` message is one. The Runtime also writes notices into
 * the Boss conversation — a project converging or being archived — and those
 * are authored `assistant` so they appear in the thread, but they answer
 * nothing.
 *
 * `taskId` would not separate them: a Boss reply has no task either, because
 * the Boss is submit-and-settle rather than a durable task like a worker's.
 * `state` would not either: a notice is `done`, which is also a finished Boss
 * reply's state.
 *
 * `replyToId` does. Every reply points at the question it answers; a notice is
 * written by the Runtime and points at nothing.
 */
function isReply(message: AgentChatMessage): boolean {
  return message.author === 'assistant' && message.replyToId !== null;
}

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
 *
 * The walk is by `sequence`, not by array position. "Earlier" is a claim about
 * the conversation, and a caller's array order is not: an unsorted list would
 * put a later reply before the question it answered and the turn would go
 * unmarked, with nothing to show anything was wrong. Ordering here costs one
 * sort and removes that dependency.
 */
export function concurrentTurnIds(messages: readonly AgentChatMessage[]): ReadonlySet<string> {
  const ordered = [...messages].sort((left, right) => left.sequence - right.sequence);
  const concurrent = new Set<string>();
  /*
   * One pass carrying the latest moment any reply so far was still changing.
   * A question is concurrent if that moment is later than the question, because
   * a reply that finished before the question would have an earlier `updatedAt`
   * and would no longer be the latest. Linear in the thread rather than scanning
   * the prefix per message, which matters because every streaming frame re-runs
   * this.
   */
  let latestReplyUpdate = Number.NEGATIVE_INFINITY;
  for (const message of ordered) {
    if (isReply(message)) {
      const updatedAt = Date.parse(message.updatedAt);
      if (!Number.isNaN(updatedAt)) latestReplyUpdate = Math.max(latestReplyUpdate, updatedAt);
      continue;
    }
    if (message.author !== 'user') continue;
    const askedAt = Date.parse(message.updatedAt);
    if (Number.isNaN(askedAt)) continue;
    if (latestReplyUpdate > askedAt) concurrent.add(message.id);
  }
  return concurrent;
}

