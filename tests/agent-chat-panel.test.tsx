// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentChatPanel } from '../src/features/agent-chat/AgentChatPanel.js';
import type { RuntimeInfo } from '../src/shared/api/runtime.js';

const runtime: RuntimeInfo = {
  name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [],
  agentChatContract: '1.5.0', agentChatPaths: 4,
};

const conversation = {
  version: '1.5.0',
  id: `chat_${'a'.repeat(24)}`,
  agentId: 'agt_alpha',
  agentRevisionId: 'agr_alpha',
  providerId: 'magpie',
  modelId: 'fixture/chat-model',
  configurationRevisionId: 'cfg_alpha',
  messages: [],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('Agent Chat panel', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', { randomUUID: () => 'fixture-uuid' });
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === '/v1/agent-chat/agents') {
        return Promise.resolve(json({ version: '1.5.0', agents: [{
          id: 'agt_alpha', name: 'Chat Agent', currentRevisionId: 'agr_alpha',
          providerId: 'magpie', modelId: 'fixture/chat-model', isDefault: true, archived: false,
        }] }));
      }
      if (path === '/v1/agent-chat/conversations' && init?.method === 'POST') return Promise.resolve(json(conversation, 201));
      if (path === `/v1/agent-chat/conversations/${conversation.id}`) {
        return Promise.resolve(json({
          ...conversation,
          messages: [{
            id: `amsg_${'b'.repeat(24)}`, sequence: 1, author: 'user', body: '你好',
            state: 'published', taskId: null, error: null,
          }, {
            id: `amsg_${'c'.repeat(24)}`, sequence: 2, author: 'assistant', body: '你好，我是 Agent。',
            state: 'succeeded', taskId: 'task_alpha', error: null,
          }],
        }));
      }
      if (path === `/v1/agent-chat/conversations/${conversation.id}/messages`) {
        return Promise.resolve(json({
          version: '1.5.0',
          conversationId: conversation.id,
          userMessage: {
            id: `amsg_${'b'.repeat(24)}`, sequence: 1, author: 'user', body: '你好',
            state: 'published', taskId: null, error: null,
          },
          assistantMessage: {
            id: `amsg_${'c'.repeat(24)}`, sequence: 2, author: 'assistant', body: '你好，我是 Agent。',
            state: 'succeeded', taskId: 'task_alpha', error: null,
          },
        }, 202));
      }
      return Promise.resolve(json({ error: 'not found' }, 404));
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('creates a configured Agent conversation and sends a message', async () => {
    render(<AgentChatPanel runtime={runtime} />);
    expect(await screen.findByRole('heading', { name: 'Agent 对话' })).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: '开始对话' }));
    const input = await screen.findByLabelText('给 Agent 发消息');
    fireEvent.change(input, { target: { value: '你好' } });
    fireEvent.submit(screen.getByRole('button', { name: '发送' }).closest('form')!);
    await waitFor(() => expect(screen.getByText('你好，我是 Agent。')).toBeTruthy());
  });

  it('shows a bounded unsupported Runtime state', async () => {
    render(<AgentChatPanel runtime={{
      ...runtime, agentChatContract: undefined, agentChatPaths: undefined,
    }} />);
    expect(await screen.findByText(/agentChatContract: 1\.5\.0/)).toBeTruthy();
  });
});
