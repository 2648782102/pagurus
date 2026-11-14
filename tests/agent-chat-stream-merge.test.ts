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
});
