// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentChatPanel } from '../src/features/agent-chat/AgentChatPanel.js';
import type { RuntimeInfo } from '../src/shared/api/runtime.js';

const runtime: RuntimeInfo = {
  name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [],
  agentChatContract: '1.8.0', agentChatPaths: 6,
};

const conversationId = `chat_${'a'.repeat(24)}`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function conversation(state: 'thinking' | 'replied') {
  return {
    version: '1.8.0',
    id: conversationId,
    agentId: 'agt_alpha',
    agentRevisionId: 'agr_alpha',
    providerId: 'magpie',
    modelId: 'fixture/chat-model',
    configurationRevisionId: 'cfg_alpha',
    reasoningEffort: 'medium',
    messages: [
      {
        id: `amsg_${'b'.repeat(24)}`, sequence: 1, author: 'user', body: '你好',
        state: 'published', taskId: null, error: null, phase: 'accepted',
        progress: null, updatedAt: '2026-11-15T00:00:00.000Z', replyToId: null, activity: [],
      },
      {
        id: `amsg_${'c'.repeat(24)}`, sequence: 2, author: 'assistant',
        body: state === 'replied' ? '已完成' : '', state,
        taskId: 'task_alpha', error: null,
        phase: state === 'replied' ? 'terminal' : 'preparing',
        progress: state === 'replied' ? 100 : null,
        updatedAt: '2026-11-15T00:00:01.000Z',
        replyToId: `amsg_${'b'.repeat(24)}`, activity: [],
      },
    ],
  };
}

describe('Agent Chat stream stall recovery', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', { randomUUID: () => 'fixture-uuid' });
    let polls = 0;
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/agent-chat/agents') {
        return Promise.resolve(json({ version: '1.8.0', agents: [{
          id: 'agt_alpha', name: '中文助手', currentRevisionId: 'agr_alpha',
          providerId: 'magpie', modelId: 'fixture/chat-model', isDefault: true, archived: false,
        }] }));
      }
      if (path === '/v1/model-catalog') {
        return Promise.resolve(json({ models: [{
          providerId: 'magpie', modelId: 'fixture/chat-model',
          reference: 'magpie:fixture/chat-model', displayName: 'Fixture', capabilities: ['chat'],
        }] }));
      }
      if (path.startsWith('/v1/agent-chat/conversations?limit=')) {
        return Promise.resolve(json({
          version: '1.8.0',
          conversations: [{ id: conversationId, agentId: 'agt_alpha', reasoningEffort: 'medium',
            createdAt: '2026-11-15T00:00:00.000Z', messageCount: 2, lastMessagePreview: '你好' }],
          defaultModelId: null,
        }));
      }
      if (path === `/v1/agent-chat/conversations/${conversationId}`) {
        polls += 1;
        return Promise.resolve(json(conversation(polls > 1 ? 'replied' : 'thinking')));
      }
      return Promise.resolve(json({ error: 'not found' }, 404));
    }));
    class SilentEventSource {
      addEventListener(): void {}
      close(): void {}
    }
    vi.stubGlobal('EventSource', SilentEventSource);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('falls back to polling only after the stream stays silent well past the heartbeat', async () => {
    render(<AgentChatPanel runtime={runtime} />);
    await waitFor(() => expect(screen.getByText('你好')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('已完成')).toBeTruthy(), { timeout: 20_000 });
    expect(screen.queryByText('正在思考…')).toBeNull();
  }, 25_000);

  it('does not label a slow model as stalled before the heartbeat window expires', async () => {
    render(<AgentChatPanel runtime={runtime} />);
    await waitFor(() => expect(screen.getByText('你好')).toBeTruthy());
    await new Promise((resolve) => setTimeout(resolve, 9_000));
    expect(screen.queryByText(/已恢复轮询/)).toBeNull();
  }, 20_000);
});
