import { describe, expect, it } from 'vitest';
import { blockingReply, concurrentTurnIds } from '../src/features/agent-chat/concurrent-turns.js';
import type { AgentChatMessage } from '../src/shared/api/agent-chat.js';

function message(
  id: string,
  sequence: number,
  author: 'user' | 'assistant' | 'runtime',
  updatedAt: string,
  body = '',
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
    replyToId: null,
    activity: [],
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
    expect(blockingReply(messages, 'u2')?.id).toBe('a1');
  });

  it('marks nothing when each question waited for the previous answer', () => {
    const messages = [
      message('u1', 1, 'user', '2026-11-20T15:55:00.000Z', 'A'),
      message('a1', 2, 'assistant', '2026-11-20T15:55:02.000Z', 'answer to A'),
      message('u2', 3, 'user', '2026-11-20T15:55:04.000Z', 'B'),
      message('a2', 4, 'assistant', '2026-11-20T15:55:06.000Z', 'answer to B'),
    ];
    expect([...concurrentTurnIds(messages)]).toEqual([]);
    expect(blockingReply(messages, 'u1')).toBeNull();
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
    expect(blockingReply(messages, 'u2')?.id).toBe('a1');
  });

  it('ignores messages whose timestamp cannot be read', () => {
    const messages = [
      message('u1', 1, 'user', 'not a date', 'A'),
      message('a1', 2, 'assistant', '2026-11-20T15:55:09.000Z', 'answer'),
    ];
    expect([...concurrentTurnIds(messages)]).toEqual([]);
  });

  it('has no blocking reply for an unknown message', () => {
    expect(blockingReply([message('u1', 1, 'user', '2026-11-20T15:55:00.000Z')], 'nope')).toBeNull();
  });
});
