// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
      if (path === '/v1/agents/agt_alpha') {
        return Promise.resolve(json({ agent: {
          id: 'agt_alpha',
          currentRevisionId: 'agr_alpha',
          archived: false,
          isDefault: true,
          current: {
            id: 'agr_alpha', name: '研究助手', instructions: '', providerId: 'magpie',
            modelId: 'fixture/chat-model', createdAt: '2026-11-16T00:00:00.000Z',
            grantedCapabilities: [{ kind: 'tool', name: 'read_file' }],
          },
          revisions: [{
            id: 'agr_alpha', name: '研究助手', instructions: '', providerId: 'magpie',
            modelId: 'fixture/chat-model', createdAt: '2026-11-16T00:00:00.000Z',
            grantedCapabilities: [{ kind: 'tool', name: 'read_file' }],
          }],
        } }));
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

    expect(await screen.findByText('发布已通过。')).toBeTruthy();
    // The bar states which Agent owns the open thread.
    const chrome = screen.getByRole('banner');
    expect(within(chrome).getByText('研究助手')).toBeTruthy();
  });

  it('skips an abandoned empty conversation when resuming', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    // The empty thread is neither resumed nor offered in history.
    fireEvent.click(screen.getByRole('button', { name: '对话记录' }));
    const drawer = screen.getByRole('dialog', { name: '对话记录' });
    expect(within(drawer).queryByText('（空会话）')).toBeNull();
    expect(within(drawer).getByText(/帮我看一下发布状态/)).toBeTruthy();
  });

  it('does not expose operator-only surfaces', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    // The product app has no runtime policy, capability, or secret entry points.
    expect(screen.queryByRole('link', { name: /运行时设置/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /能力目录/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /敏感信息/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: /配置版本/ })).toBeNull();
    // It does keep a route back to the console, behind history.
    fireEvent.click(screen.getByRole('button', { name: '对话记录' }));
    expect(screen.getByRole('link', { name: '打开控制台' })).toBeTruthy();
  });

  it('returns to the prompt after starting a new conversation', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '新对话' }));

    // Resuming is a launch-time behaviour only. Pressing "new" must not be
    // undone by the next catalog poll re-entering the old thread.
    expect(await screen.findByRole('heading', { name: /和 研究助手 说点什么/ })).toBeTruthy();
    expect(screen.getByLabelText('输入消息')).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.queryByText('发布已通过。')).toBeNull();
  });

  it('groups history by recency and filters it by search', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '对话记录' }));
    expect(screen.getByRole('dialog', { name: '对话记录' })).toBeTruthy();

    // The resumed thread appears under a recency group, not as a flat list.
    // Which group depends on how old the fixture is relative to the real clock,
    // so assert the structure rather than a specific bucket.
    expect(screen.getByRole('heading', { name: /今天|昨天|近 7 天|更早/ })).toBeTruthy();

    const search = screen.getByPlaceholderText('搜索对话');
    fireEvent.change(search, { target: { value: '不存在的关键词' } });
    expect(screen.getByText('没有匹配的对话。')).toBeTruthy();

    fireEvent.change(search, { target: { value: '发布状态' } });
    expect(screen.queryByText('没有匹配的对话。')).toBeNull();
  });

  it('states the pinned model and offers a new conversation instead of a fake switch', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '对话模型：fixture/chat-model' }));
    expect(screen.getByText('本次对话固定使用')).toBeTruthy();
    expect(screen.getByText(/换模型需要新开一段对话/)).toBeTruthy();
    // Capability boundary is stated in plain language, not as a permission table.
    expect(await screen.findByText(/1 个工具/)).toBeTruthy();

    // The only honest model change starts a new conversation.
    fireEvent.click(screen.getByRole('button', { name: '用新模型开新对话' }));
    expect(await screen.findByRole('heading', { name: /和 研究助手 说点什么/ })).toBeTruthy();
  });

  it('offers copy on a settled assistant reply only', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    // One reply exists, so exactly one copy affordance exists.
    expect(screen.getAllByRole('button', { name: '复制回复' })).toHaveLength(1);
    // The user message has no copy action.
    expect(screen.getAllByRole('button', { name: '复制回复' }).length).toBeLessThan(
      screen.getAllByRole('article').length,
    );
  });

  it('moves focus into the history sheet and back to its trigger', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    const opener = screen.getByRole('button', { name: '对话记录' });
    fireEvent.click(opener);

    // A modal sheet must take focus, or a keyboard user is stuck behind it.
    const search = screen.getByPlaceholderText('搜索对话');
    expect(document.activeElement).toBe(search);

    fireEvent.click(screen.getByRole('button', { name: '关闭对话记录' }));
    expect(document.activeElement).toBe(opener);
  });

  it('does not send while an IME is still composing', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    const input = screen.getByLabelText('输入消息');
    fireEvent.change(input, { target: { value: '帮我' } });

    // Commit-candidate Enter carries isComposing; sending then would truncate
    // the sentence the person is still typing.
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.getByText('帮我')).toBeTruthy();
    // Still in the same thread, not a new message.
    expect(screen.queryByText('正在等待回复…')).toBeNull();

    // A plain Enter sends.
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByText('正在发送…')).toBeTruthy();
  });

  it('shows the pinned revisions in the context panel', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '上下文' }));

    const panel = screen.getByRole('complementary', { name: '对话上下文' });
    expect(within(panel).getByText('固定版本')).toBeTruthy();
    expect(within(panel).getByText('magpie:fixture/chat-model')).toBeTruthy();
    // Long ids are shortened; the distinguishing tail must still be visible.
    expect(within(panel).getAllByText(/agr_alpha/).length).toBeGreaterThan(0);
  });

  it('reads the capability boundary into the panel on demand', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '上下文' }));
    const panel = screen.getByRole('complementary', { name: '对话上下文' });
    expect(await within(panel).findByText(/read_file/)).toBeTruthy();
  });

  it('closes the context panel and reports it as collapsed', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    const toggle = screen.getByRole('button', { name: '上下文' });
    fireEvent.click(toggle);
    // A disclosure, not a toggle button: the panel is a region the control owns.
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe('agent-context');

    fireEvent.click(screen.getByRole('button', { name: '收起上下文' }));
    expect(screen.queryByRole('complementary', { name: '对话上下文' })).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

});
