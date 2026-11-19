// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentContextPanel } from '../src/agent/AgentContextPanel.js';
import type { AgentChatConversation } from '../src/shared/api/agent-chat.js';

afterEach(() => cleanup());

function conversationWith(
  activity: AgentChatConversation['messages'][number]['activity'],
): AgentChatConversation {
  return {
    version: '1.8.0',
    id: 'chat_a',
    agentId: 'agt_a',
    agentRevisionId: 'agr_4695c0081f4e42f49d35ea03a434fcbe',
    providerId: 'magpie',
    modelId: 'fixture/model',
    configurationRevisionId: 'cfg_a',
    reasoningEffort: 'medium',
    messages: [{
      id: 'm1', sequence: 1, author: 'assistant', body: '需要你批准', state: 'waiting_approval',
      taskId: 'task_a', error: null, phase: 'human', progress: null,
      updatedAt: '2026-11-16T00:00:00.000Z', replyToId: null, activity,
    }],
  };
}

const idle = { phase: 'builtin' } as const;

describe('context panel activity', () => {
  it('surfaces a blocking approval above the list', () => {
    render(
      <AgentContextPanel
        open
        conversation={conversationWith([{
          id: 'act_1', kind: 'approval', label: '写入文件', state: 'waiting_approval', detail: null,
        }])}
        capabilities={idle}
        onRefreshCapabilities={() => {}}
        onClose={() => {}}
      />,
    );

    const panel = screen.getByRole('complementary', { name: '对话上下文' });
    expect(within(panel).getByText('写入文件')).toBeTruthy();
    expect(within(panel).getByText('等待你批准')).toBeTruthy();
    // The header states the blocking condition, not just a total.
    expect(within(panel).getByText(/1 待处理/)).toBeTruthy();
  });

  it('says so when a run has no activity', () => {
    render(
      <AgentContextPanel
        open
        conversation={conversationWith([])}
        capabilities={idle}
        onRefreshCapabilities={() => {}}
        onClose={() => {}}
      />,
    );
    // A message with no tool or approval still contributes one timeline entry;
    // "nothing happened" only applies when there are no messages at all.
    expect(screen.getByText('Agent 作出回复')).toBeTruthy();
  });

  it('keeps the pinned Agent revision readable', () => {
    render(
      <AgentContextPanel
        open
        conversation={conversationWith([])}
        capabilities={idle}
        onRefreshCapabilities={() => {}}
        onClose={() => {}}
      />,
    );
    // Prefix and tail both survive, so the label identifies the revision.
    expect(screen.getByText('agr_4695…34fcbe')).toBeTruthy();
  });

  it('explains a Runtime-owned adapter instead of reporting a failure', () => {
    render(
      <AgentContextPanel
        open
        conversation={conversationWith([])}
        capabilities={idle}
        onRefreshCapabilities={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/Runtime 内建的老板 Agent/)).toBeTruthy();
  });

  it('renders nothing visible while closed', () => {
    render(
      <AgentContextPanel
        open={false}
        conversation={null}
        capabilities={idle}
        onRefreshCapabilities={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByRole('complementary', { name: '对话上下文' })).toBeNull();
  });
});
