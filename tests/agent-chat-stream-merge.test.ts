import { describe, expect, it } from 'vitest';
import {
  applyFrame,
  applyMessageFrame,
  mergeConversation,
  mergeRefresh,
  replaceWith,
} from '../src/features/agent-chat/merge-conversation.js';
import type { AgentChatConversation, AgentChatMessage } from '../src/shared/api/agent-chat.js';

function message(id: string, sequence: number, updatedAt: string, body: string): AgentChatMessage {
  return {
    id,
    sequence,
    author: 'assistant',
    body,
    state: 'replied',
    taskId: `task_${id}`,
    error: null,
    phase: 'terminal',
    progress: 100,
    updatedAt,
    replyToId: null,
    activity: [],
  };
}

function conversation(messages: readonly AgentChatMessage[], id = 'chat_a'): AgentChatConversation {
  return {
    version: '1.9.0',
    id,
    agentId: 'agt_a',
    agentRevisionId: 'agr_a',
    providerId: 'magpie',
    modelId: 'fixture/model',
    configurationRevisionId: 'cfg_a',
    reasoningEffort: 'medium',
    messages,
  };
}

describe('agent chat snapshot merge', () => {
  it('keeps a newer streamed message when a late snapshot is older', () => {
    const previous = conversation([
      message('m1', 1, '2026-11-15T00:00:02.000Z', '较新的回复'),
    ]);
    const snapshot = conversation([
      message('m1', 1, '2026-11-15T00:00:01.000Z', '较旧的回复'),
      message('m2', 2, '2026-11-15T00:00:01.500Z', '另一条'),
    ]);
    const merged = mergeConversation(previous, snapshot);
    expect(merged.messages.map((entry) => entry.id)).toEqual(['m1', 'm2']);
    expect(merged.messages[0]?.body).toBe('较新的回复');
  });

  it('does not let a stale frame overwrite a newer message body', () => {
    const newer = conversation([
      message('m1', 1, '2026-11-15T00:00:05.000Z', '最终回复'),
    ]);
    const stale = { ...message('m1', 1, '2026-11-15T00:00:03.000Z', '旧的流式片段') };
    const staleConversation = conversation([stale]);
    const merged = mergeConversation(newer, staleConversation);
    expect(merged.messages[0]?.body).toBe('最终回复');
  });

  it('keeps the conversation id stable when merging an older snapshot', () => {
    const current = conversation([message('m1', 1, '2026-11-15T00:00:05.000Z', '最新')]);
    const older = conversation([message('m1', 1, '2026-11-15T00:00:01.000Z', '旧')]);
    const merged = mergeConversation(current, older);
    expect(merged.id).toBe(current.id);
    expect(merged.messages[0]?.body).toBe('最新');
  });
});

describe('agent chat write paths', () => {
  const chatA = conversation([message('m1', 1, '2026-11-15T00:00:01.000Z', 'A 的回复')], 'chat_a');
  const chatB = conversation([message('m9', 1, '2026-11-15T00:00:09.000Z', 'B 的回复')], 'chat_b');

  describe('command results', () => {
    it('replaces the screen when switching to another conversation', () => {
      expect(replaceWith(chatB)(chatA)).toEqual(chatB);
    });

    it('replaces rather than merging, because the value is authoritative', () => {
      expect(replaceWith(chatB)(chatA)).toEqual(chatB);
      expect(replaceWith(chatA)(chatB)).toEqual(chatA);
    });

    it('clears the screen for a null target', () => {
      expect(replaceWith(null)(chatA)).toBeNull();
    });
  });

  describe('refreshes', () => {
    it('merges when reloading the conversation already open', () => {
      const refreshed = conversation(
        [message('m1', 1, '2026-11-15T00:00:02.000Z', 'A 的新回复')],
        'chat_a',
      );
      const next = mergeRefresh(refreshed)(chatA);
      expect(next?.id).toBe('chat_a');
      expect(next?.messages[0]?.body).toBe('A 的新回复');
    });

    it('keeps a newer streamed body when the re-read is older', () => {
      const current = conversation(
        [message('m1', 1, '2026-11-15T00:00:09.000Z', '最终回复')],
        'chat_a',
      );
      const older = conversation(
        [message('m1', 1, '2026-11-15T00:00:01.000Z', '第一个字')],
        'chat_a',
      );
      expect(mergeRefresh(older)(current)?.messages[0]?.body).toBe('最终回复');
    });

    it('opens the first conversation when nothing is on screen', () => {
      expect(mergeRefresh(chatB)(null)).toEqual(chatB);
    });
  });

  describe('streamed frames', () => {
    /*
     * A stream cleanup runs asynchronously, so a frame from the conversation
     * the user just left can arrive one tick after the switch. Accepting it
     * would swap the screen back, which is the regression this guards.
     */
    it('discards a snapshot from a conversation that is no longer open', () => {
      const next = applyFrame(chatB)(chatA);
      expect(next?.id).toBe('chat_a');
      expect(next?.messages[0]?.body).toBe('A 的回复');
    });

    it('discards a message from a conversation that is no longer open', () => {
      const late = message('m2', 2, '2026-11-15T00:00:09.000Z', 'B 迟到的消息');
      const next = applyMessageFrame(late, 'chat_b')(chatA);
      expect(next?.id).toBe('chat_a');
      expect(next?.messages.map((entry) => entry.id)).toEqual(['m1']);
    });

    it('merges a snapshot for the conversation on screen', () => {
      const snapshot = conversation(
        [
          message('m1', 1, '2026-11-15T00:00:01.000Z', 'A 的回复'),
          message('m2', 2, '2026-11-15T00:00:02.000Z', 'A 的第二条'),
        ],
        'chat_a',
      );
      const next = applyFrame(snapshot)(chatA);
      expect(next?.messages.map((entry) => entry.id)).toEqual(['m1', 'm2']);
    });

    it('adds a message for the conversation on screen in sequence order', () => {
      const late = message('m2', 2, '2026-11-15T00:00:02.000Z', '稍后到达');
      const next = applyMessageFrame(late, 'chat_a')(chatA);
      expect(next?.messages.map((entry) => entry.id)).toEqual(['m1', 'm2']);
    });

    it('keeps the newer body when a late message frame is older', () => {
      const stale = message('m1', 1, '2026-11-15T00:00:00.500Z', '旧的流式片段');
      const next = applyMessageFrame(stale, 'chat_a')(chatA);
      expect(next?.messages[0]?.body).toBe('A 的回复');
    });

    it('opens a snapshot when no conversation is on screen', () => {
      // The landing panel has no conversation yet; the first frame must seed it.
      expect(applyFrame(chatB)(null)).toEqual(chatB);
    });

    it('ignores a message frame when no conversation is open', () => {
      // A message has nowhere to attach: a snapshot is what seeds the thread.
      expect(applyMessageFrame(chatB.messages[0]!, 'chat_b')(null)).toBeNull();
    });
  });
});
