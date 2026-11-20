import { describe, expect, it } from 'vitest';
import { concurrentTurnIds } from '../src/features/agent-chat/concurrent-turns.js';
import { isPendingAgentChatState, isTerminalAgentChatState } from '../src/shared/api/agent-chat-contract.js';
import type { AgentChatMessage } from '../src/shared/api/agent-chat.js';

function message(
  id: string,
  sequence: number,
  author: 'user' | 'assistant' | 'runtime',
  updatedAt: string,
  body = '',
  replyToId: string | null = author === 'assistant' ? 'u1' : null,
): AgentChatMessage {
  return {
    id,
    sequence,
    author,
    body,
    state: author === 'user' ? 'published' : 'replied',
    taskId: null,
    error: null,
    phase: author === 'user' ? 'accepted' : 'terminal',
    progress: null,
    updatedAt,
    replyToId,
    activity: [],
  };
}

/**
 * A notice the Runtime writes into the Boss conversation. Authored `assistant`
 * so it appears in the thread, but it answers nothing — `replyToId` is null.
 */
function notice(id: string, sequence: number, updatedAt: string): AgentChatMessage {
  return {
    ...message(id, sequence, 'assistant', updatedAt, '项目已归档', null),
    state: 'done',
  };
}

describe('which turns were asked while a reply was being written', () => {
  it('marks a question asked before the earlier reply stopped changing', () => {
    /*
     * The timestamps below are the shape the Runtime actually produces when two
     * messages are posted 60 ms apart and the first completion is held open:
     * the first answer's last update lands after the second question was
     * accepted.
     */
    const messages = [
      message('u1', 1, 'user', '2026-11-20T15:55:13.373Z', 'A'),
      message('a1', 2, 'assistant', '2026-11-20T15:55:13.569Z', 'answer to A'),
      message('u2', 3, 'user', '2026-11-20T15:55:13.434Z', 'B'),
      message('a2', 4, 'assistant', '2026-11-20T15:55:13.557Z', 'answer to B'),
    ];
    expect([...concurrentTurnIds(messages)]).toEqual(['u2']);
  });

  it('marks nothing when each question waited for the previous answer', () => {
    const messages = [
      message('u1', 1, 'user', '2026-11-20T15:55:00.000Z', 'A'),
      message('a1', 2, 'assistant', '2026-11-20T15:55:02.000Z', 'answer to A'),
      message('u2', 3, 'user', '2026-11-20T15:55:04.000Z', 'B'),
      message('a2', 4, 'assistant', '2026-11-20T15:55:06.000Z', 'answer to B'),
    ];
    expect([...concurrentTurnIds(messages)]).toEqual([]);
  });

  it('marks every turn in a burst, not just the second', () => {
    // Three questions, one long reply: both later turns were asked mid-flight.
    const messages = [
      message('u1', 1, 'user', '2026-11-20T15:55:00.000Z', 'A'),
      message('a1', 2, 'assistant', '2026-11-20T15:55:09.000Z', 'answer to all three'),
      message('u2', 3, 'user', '2026-11-20T15:55:01.000Z', 'B'),
      message('u3', 4, 'user', '2026-11-20T15:55:02.000Z', 'C'),
      message('a2', 5, 'assistant', '2026-11-20T15:55:03.000Z', 'answer to B'),
      message('a3', 6, 'assistant', '2026-11-20T15:55:04.000Z', 'answer to C'),
    ];
    expect([...concurrentTurnIds(messages)]).toEqual(['u2', 'u3']);
  });

  it('ignores messages whose timestamp cannot be read', () => {
    const messages = [
      message('u1', 1, 'user', 'not a date', 'A'),
      message('a1', 2, 'assistant', '2026-11-20T15:55:09.000Z', 'answer'),
    ];
    expect([...concurrentTurnIds(messages)]).toEqual([]);
  });

  it('reaches the same answer whatever order the array arrives in', () => {
    /*
     * The caller's array order is not a claim about the conversation. If it
     * were trusted, an unsorted list would put the reply before the question it
     * answered, the turn would silently go unmarked, and nothing would look
     * wrong. The walk is by sequence instead.
     */
    const u1 = message('u1', 1, 'user', '2026-11-20T15:55:00.000Z', 'A');
    const a1 = message('a1', 2, 'assistant', '2026-11-20T15:55:09.000Z', 'answer to A');
    const u2 = message('u2', 3, 'user', '2026-11-20T15:55:01.000Z', 'B');
    expect([...concurrentTurnIds([u1, a1, u2])]).toEqual(['u2']);
    expect([...concurrentTurnIds([u1, u2, a1])]).toEqual(['u2']);
    expect([...concurrentTurnIds([a1, u2, u1])]).toEqual(['u2']);
  });

  describe('Runtime notices', () => {
    /*
     * A notice is authored `assistant` so it renders in the thread, but it is
     * not a reply: no `replyToId`, no task, and `state` `done` — which a
     * finished Boss reply also uses, and a Boss reply has no task either. If a
     * notice counted as a reply, it would be reported as the reply a concurrent
     * turn was blocked on, and its timestamp would mark the next question as
     * concurrent even when nothing was generating.
     */
    it('does not let a notice mark the next question concurrent', () => {
      const messages = [
        message('u1', 1, 'user', '2026-11-20T15:55:00.000Z', 'A'),
        message('a1', 2, 'assistant', '2026-11-20T15:55:02.000Z', 'answer to A'),
        notice('n1', 3, '2026-11-20T15:55:03.000Z'),
        message('u2', 4, 'user', '2026-11-20T15:55:04.000Z', 'B'),
      ];
      expect([...concurrentTurnIds(messages)]).toEqual([]);
    });

    it('does not mark a question concurrent just because a notice came before it', () => {
      // The notice is newer than the question, but it was never generating.
      const messages = [
        message('u1', 1, 'user', '2026-11-20T15:55:00.000Z', 'A'),
        message('a1', 2, 'assistant', '2026-11-20T15:55:02.000Z', 'answer to A'),
        notice('n1', 3, '2026-11-20T15:55:07.000Z'),
        message('u2', 4, 'user', '2026-11-20T15:55:06.000Z', 'B'),
      ];
      expect([...concurrentTurnIds(messages)]).toEqual([]);
    });

    it('still marks a question asked during a real reply that a notice followed', () => {
      const messages = [
        message('u1', 1, 'user', '2026-11-20T15:55:00.000Z', 'A'),
        notice('n1', 2, '2026-11-20T15:55:01.000Z'),
        message('a1', 3, 'assistant', '2026-11-20T15:55:09.000Z', 'answer to A'),
        message('u2', 4, 'user', '2026-11-20T15:55:05.000Z', 'B'),
      ];
      expect([...concurrentTurnIds(messages)]).toEqual(['u2']);
    });
  });
});

describe('the done state', () => {
  /*
   * The Runtime settles a Boss turn and writes its notices as `done`. The
   * client contract did not list it, so it fell through `isPending` — which
   * kept the poll running and told the reader a reply was still being written,
   * for a reply that had already landed.
   */
  it('is finished, not pending', () => {
    expect(isTerminalAgentChatState('done')).toBe(true);
    expect(isPendingAgentChatState('done')).toBe(false);
  });

  it('does not make a settled Boss turn look like it is still generating', () => {
    const settled = { ...message('a1', 2, 'assistant', '2026-11-20T15:55:02.000Z'), state: 'done' as const };
    expect(isPendingAgentChatState(settled.state)).toBe(false);
  });
});

describe('a real transcript', () => {
  /*
   * Verbatim from a Boss conversation where two messages were posted 0.4 s
   * apart and both completed. The first reply's last update (54.498) lands
   * after the second question (52.375), which is the whole signal: that
   * question arrived while the reply was still being written. The second reply
   * finishing later changes nothing about it.
   */
  const real = [
    // The reply ids are the real ones, so this reads as the Runtime's output and
    // not as three messages that happen to share a default.
    message('m1', 1, 'user', '2026-11-20T16:25:51.960Z', '什么是事务隔离级别'),
    message('m2', 2, 'assistant', '2026-11-20T16:25:54.498Z', '回答一', 'm1'),
    message('m3', 3, 'user', '2026-11-20T16:25:52.375Z', '可重复读解决了什么'),
    message('m4', 4, 'assistant', '2026-11-20T16:25:59.343Z', '回答二', 'm3'),
  ];

  it('marks exactly the turn that was asked mid-reply', () => {
    expect([...concurrentTurnIds(real)]).toEqual(['m3']);
  });
});
