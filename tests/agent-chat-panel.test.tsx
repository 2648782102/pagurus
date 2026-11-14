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
          id: 'boss-agent', name: '老板 Agent', currentRevisionId: 'boss-runtime-v1',
          providerId: 'runtime', modelId: '组织编排', isDefault: false, archived: false,
        }, {
          id: 'agt_alpha', name: '中文助手', currentRevisionId: 'agr_alpha',
          providerId: 'magpie', modelId: 'fixture/chat-model', isDefault: true, archived: false,
        }] }));
      }
      if (path === '/v1/agent-chat/conversations' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body ?? '{}')) as { agentId?: string };
        if (body.agentId === 'boss-agent') {
          return Promise.resolve(json({
            ...conversation,
            agentId: 'boss-agent',
            agentRevisionId: 'boss-runtime-v1',
            providerId: 'runtime',
            modelId: '组织编排',
          }, 201));
        }
        return Promise.resolve(json(conversation, 201));
      }
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

  it('starts a conversation and sends messages with Enter', async () => {
    render(<AgentChatPanel runtime={runtime} />);
    expect(await screen.findByRole('heading', { name: '和哪个 Agent 聊？' })).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: '开始对话' }));
    const input = await screen.findByLabelText('输入消息');
    expect(screen.queryByLabelText('Agent')).toBeNull();
    fireEvent.change(input, { target: { value: '你好' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('你好，我是 Agent。')).toBeTruthy());
    expect(screen.getByText('你好')).toBeTruthy();
  });

  it('keeps Shift Enter as a newline and hides technical details by default', async () => {
    render(<AgentChatPanel runtime={runtime} />);
    fireEvent.click(await screen.findByRole('button', { name: '开始对话' }));
    const input = await screen.findByLabelText('输入消息');
    fireEvent.change(input, { target: { value: '第一行' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect((input as HTMLTextAreaElement).value).toBe('第一行');
    expect(screen.queryByText('Agent revision')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '会话信息' }));
    expect(await screen.findByText('Agent revision')).toBeTruthy();
  });

  it('labels the Runtime-owned Boss Agent as organization orchestration', async () => {
    render(<AgentChatPanel runtime={runtime} />);
    expect(await screen.findByRole('option', { name: /老板 Agent/ })).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: '开始对话' }));
    expect(await screen.findByText(/老板 Agent：提交意图后/)).toBeTruthy();
  });

  it('shows a bounded unsupported Runtime state', async () => {
    render(<AgentChatPanel runtime={{
      ...runtime, agentChatContract: undefined, agentChatPaths: undefined,
    }} />);
    expect(await screen.findByText(/agentChatContract: 1\.5\.0/)).toBeTruthy();
  });
});
