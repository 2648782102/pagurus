// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentChatPanel } from '../src/features/agent-chat/AgentChatPanel.js';
import type { RuntimeInfo } from '../src/shared/api/runtime.js';

const runtime: RuntimeInfo = {
  name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [],
  agentChatContract: '1.8.0', agentChatPaths: 6,
};

const olderConversationId = `chat_${'1'.repeat(24)}`;
const newerConversationId = `chat_${'2'.repeat(24)}`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function view(id: string, agentId: string, preview: string) {
  return {
    version: '1.8.0',
    id,
    agentId,
    agentRevisionId: `agr_${agentId.slice(-4)}`,
    providerId: 'magpie',
    modelId: 'fixture/chat-model',
    configurationRevisionId: 'cfg_alpha',
    reasoningEffort: 'medium',
    messages: [{
      id: `amsg_${id.slice(-24)}`, sequence: 1, author: 'user', body: preview,
      state: 'published', taskId: null, error: null, phase: 'accepted',
      progress: null, updatedAt: '2026-11-15T00:00:00.000Z', replyToId: null, activity: [],
    }],
  };
}

describe('Agent Chat landing panel', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/agent-chat/agents') {
        return Promise.resolve(json({ version: '1.8.0', agents: [
          {
            id: 'agt_alpha', name: '中文助手', currentRevisionId: 'agr_alpha',
            providerId: 'magpie', modelId: 'fixture/chat-model', isDefault: true, archived: false,
          },
          {
            id: 'agt_beta', name: '研究员', currentRevisionId: 'agr_beta',
            providerId: 'magpie', modelId: 'fixture/chat-model', isDefault: false, archived: false,
          },
        ] }));
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
              id: newerConversationId, agentId: 'agt_alpha', reasoningEffort: 'medium',
              createdAt: '2026-11-15T02:00:00.000Z', messageCount: 4, lastMessagePreview: '较新的会话',
            },
            {
              id: olderConversationId, agentId: 'agt_alpha', reasoningEffort: 'high',
              createdAt: '2026-11-14T02:00:00.000Z', messageCount: 2, lastMessagePreview: '较旧的会话',
            },
          ],
          defaultModelId: null,
        }));
      }
      if (path === `/v1/agent-chat/conversations/${newerConversationId}`) {
        return Promise.resolve(json(view(newerConversationId, 'agt_alpha', '较新的会话')));
      }
      if (path === `/v1/agent-chat/conversations/${olderConversationId}`) {
        return Promise.resolve(json(view(olderConversationId, 'agt_alpha', '较旧的会话')));
      }
      return Promise.resolve(json({ error: 'not found' }, 404));
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('EventSource', undefined);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('lands on the Agent picker instead of resuming the latest conversation', async () => {
    render(<AgentChatPanel runtime={runtime} />);
    expect(await screen.findByRole('heading', { name: '选择 Agent' })).toBeTruthy();
    // History is listed, but no conversation was opened on its own.
    expect(await screen.findByText('较新的会话')).toBeTruthy();
    expect(screen.queryByLabelText('输入消息')).toBeNull();
    expect(
      fetchMock.mock.calls.some(([path]) => String(path) === `/v1/agent-chat/conversations/${newerConversationId}`),
    ).toBe(false);
  });

  it('shows how many conversations belong to each Agent', async () => {
    render(<AgentChatPanel runtime={runtime} />);
    const alpha = await screen.findByRole('button', { name: /中文助手/ });
    expect(alpha.textContent).toContain('2 个历史会话');
    const beta = screen.getByRole('button', { name: /研究员/ });
    expect(beta.textContent).toContain('暂无历史会话');
  });

  it('scopes the history list to the selected Agent', async () => {
    render(<AgentChatPanel runtime={runtime} />);
    await screen.findByText('较新的会话');
    fireEvent.click(screen.getByRole('button', { name: /研究员/ }));
    await waitFor(() => expect(screen.queryByText('较新的会话')).toBeNull());
    expect(screen.getByText(/这个 Agent 还没有历史会话/)).toBeTruthy();
  });

  it('continues a chosen conversation from the history list', async () => {
    render(<AgentChatPanel runtime={runtime} />);
    await screen.findByText('较旧的会话');
    const buttons = screen.getAllByRole('button', { name: '继续对话' });
    fireEvent.click(buttons[1]!);
    expect(await screen.findByLabelText('输入消息')).toBeTruthy();
    expect(screen.getByText('较旧的会话')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '选择 Agent' })).toBeNull();
  });

  it('starts a brand new conversation from the same panel', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === '/v1/agent-chat/conversations' && init?.method === 'POST') {
        return Promise.resolve(json({
          version: '1.8.0', id: newerConversationId, agentId: 'agt_alpha',
          agentRevisionId: 'agr_alpha', providerId: 'magpie', modelId: 'fixture/chat-model',
          configurationRevisionId: 'cfg_alpha', reasoningEffort: 'medium', messages: [],
        }, 201));
      }
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
        return Promise.resolve(json({ version: '1.8.0', conversations: [], defaultModelId: null }));
      }
      return Promise.resolve(json({ error: 'not found' }, 404));
    });
    render(<AgentChatPanel runtime={runtime} />);
    fireEvent.click(await screen.findByRole('button', { name: '开启新对话' }));
    expect(await screen.findByLabelText('输入消息')).toBeTruthy();
  });
});
