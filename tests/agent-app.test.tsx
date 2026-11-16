// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentApp } from '../src/agent/AgentApp.js';

const runtime = {
  name: 'Conchbase',
  version: '1.0.0',
  state: 'ready',
  capabilities: [],
  agentChatContract: '1.8.0',
  agentChatPaths: 6,
};

const conversationId = `chat_${'a'.repeat(24)}`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function conversation() {
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
        id: `amsg_${'b'.repeat(24)}`, sequence: 1, author: 'user', body: '帮我看一下发布状态',
        state: 'published', taskId: null, error: null, phase: 'accepted',
        progress: null, updatedAt: '2026-11-16T00:00:00.000Z', replyToId: null, activity: [],
      },
      {
        id: `amsg_${'c'.repeat(24)}`, sequence: 2, author: 'assistant', body: '发布已通过。',
        state: 'replied', taskId: 'task_alpha', error: null, phase: 'terminal',
        progress: 100, updatedAt: '2026-11-16T00:00:01.000Z',
        replyToId: `amsg_${'b'.repeat(24)}`, activity: [],
      },
    ],
  };
}

describe('shipped Agent surface', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/health') return Promise.resolve(json({ status: 'ok', service: 'conchbase', apiVersion: 1 }));
      if (path === '/v1/runtime') return Promise.resolve(json(runtime));
      if (path === '/v1/agent-chat/agents') {
        return Promise.resolve(json({ version: '1.8.0', agents: [{
          id: 'agt_alpha', name: '研究助手', currentRevisionId: 'agr_alpha',
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
          conversations: [
            {
              // Newest by creation, but abandoned: the product must skip it.
              id: `chat_${'d'.repeat(24)}`, agentId: 'agt_alpha', reasoningEffort: 'medium',
              createdAt: '2026-11-16T01:00:00.000Z', messageCount: 0,
              lastMessagePreview: '',
            },
            {
              id: conversationId, agentId: 'agt_alpha', reasoningEffort: 'medium',
              createdAt: '2026-11-16T00:00:00.000Z', messageCount: 2,
              lastMessagePreview: '帮我看一下发布状态',
            },
          ],
          defaultModelId: null,
        }));
      }
      if (path === `/v1/agent-chat/conversations/${conversationId}`) {
        return Promise.resolve(json(conversation()));
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
  });

  it('resumes the latest conversation instead of asking again', async () => {
    render(<AgentApp />);

    await waitFor(() => expect(screen.getAllByText('帮我看一下发布状态').length).toBeGreaterThan(0));
    expect(await screen.findByText('发布已通过。')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '研究助手' })).toBeTruthy();
  });

  it('skips an abandoned empty conversation when resuming', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    // The empty thread is neither resumed nor offered in the rail.
    expect(screen.queryByText('（空会话）')).toBeNull();
    expect(screen.getAllByText('帮我看一下发布状态').length).toBeGreaterThan(0);
  });

  it('does not expose operator-only surfaces', async () => {
    render(<AgentApp />);
    await waitFor(() => expect(screen.getAllByText('帮我看一下发布状态').length).toBeGreaterThan(0));

    // The product app has no runtime policy, capability, or secret entry points.
    expect(screen.queryByRole('link', { name: /运行时设置/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /能力目录/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /敏感信息/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: /配置版本/ })).toBeNull();
    // It does keep a route back to the console for operators.
    expect(screen.getByRole('link', { name: '打开控制台' })).toBeTruthy();
  });

  it('stays on the picker after starting a new conversation', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '开始新对话' }));

    // Resuming is a launch-time behaviour only. Pressing "new" must not be
    // undone by the next catalog poll re-entering the old thread.
    expect(await screen.findByRole('heading', { name: '选择 Agent' })).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.queryByText('发布已通过。')).toBeNull();
  });
});
