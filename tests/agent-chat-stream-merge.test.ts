import { describe, expect, it } from 'vitest';
import { mergeConversation } from '../src/features/agent-chat/merge-conversation.js';
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

function conversation(messages: readonly AgentChatMessage[]): AgentChatConversation {
  return {
    version: '1.8.0',
    id: 'chat_a',
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
