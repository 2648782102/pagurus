// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentApp } from '../src/agent/AgentApp.js';

const runtime = {
  name: 'Conchbase',
  version: '1.0.0',
  state: 'ready',
  capabilities: [],
  agentChatContract: '1.9.0',
  agentChatPaths: 7,
};

const conversationId = `chat_${'a'.repeat(24)}`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function conversation() {
  return {
    version: '1.9.0',
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
  /*
   * Every request the surface makes, so a test can assert on what was sent
   * rather than only on what ended up on screen. The composer's effort control
   * is only real if the chosen level reaches the wire.
   */
  let requests: Array<{ url: string; init?: RequestInit }> = [];

  beforeEach(() => {
    requests = [];
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      requests.push({ url: path, init });
      if (path === '/v1/health') return Promise.resolve(json({ status: 'ok', service: 'conchbase', apiVersion: 1 }));
      if (path === '/v1/runtime') return Promise.resolve(json(runtime));
      if (path === '/v1/agent-chat/agents') {
        return Promise.resolve(json({ version: '1.9.0', agents: [{
          id: 'agt_alpha', name: '研究助手', currentRevisionId: 'agr_alpha',
          providerId: 'magpie', modelId: 'fixture/chat-model', isDefault: true, archived: false,
        }] }));
      }
      if (path === '/v1/model-catalog') {
        return Promise.resolve(json({ models: [{
          providerId: 'magpie', modelId: 'fixture/chat-model',
          reference: 'magpie:fixture/chat-model', displayName: 'Fixture', capabilities: ['chat'],
          /* Published levels are what make the composer's effort menu real. */
          reasoningLevels: ['low', 'medium', 'high'],
        }, {
          /*
           * A second model with a *different* level set, so a switch test can
           * tell "the chip moved" from "the chip re-rendered".
           */
          providerId: 'magpie', modelId: 'fixture/alt-model',
          reference: 'magpie:fixture/alt-model', displayName: 'Alt', capabilities: ['chat'],
          reasoningLevels: ['none', 'low', 'high', 'max'],
        }] }));
      }
      if (path.startsWith('/v1/agent-chat/conversations?limit=')) {
        return Promise.resolve(json({
          version: '1.9.0',
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
      if (path === `/v1/agent-chat/conversations/${conversationId}/messages`) {
        return Promise.resolve(json({
          version: '1.9.0',
          conversationId,
          userMessage: { id: `amsg_${'e'.repeat(24)}`, sequence: 3, author: 'user', body: '再问一句',
            state: 'published', taskId: null, error: null, phase: 'accepted', progress: null,
            updatedAt: '2026-11-16T00:00:02.000Z', replyToId: null, activity: [] },
          assistantMessage: { id: `amsg_${'f'.repeat(24)}`, sequence: 4, author: 'assistant', body: '',
            state: 'thinking', taskId: 'task_beta', error: null, phase: 'preparing', progress: null,
            updatedAt: '2026-11-16T00:00:02.000Z', replyToId: null, activity: [] },
        }, 202));
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

  it('states the current model and keeps a new conversation as its own action', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '对话模型：fixture/chat-model' }));
    expect(screen.getByText('当前使用')).toBeTruthy();
    /*
     * The model is switchable from the composer now, so the popover must not
     * keep telling the reader it is fixed — that wording was the reason a model
     * change used to throw the transcript away.
     */
    expect(screen.getByText(/都可以在输入框里随时切换/)).toBeTruthy();
    expect(screen.queryByText(/换模型需要新开一段对话/)).toBeNull();
    // Capability boundary is stated in plain language, not as a permission table.
    expect(await screen.findByText(/1 个工具/)).toBeTruthy();

    // Starting over is still offered, as a clear-the-transcript action.
    fireEvent.click(screen.getByRole('button', { name: '开新对话' }));
    expect(await screen.findByRole('heading', { name: /和 研究助手 说点什么/ })).toBeTruthy();
  });

  it('lets the reader change the effort and sends the new level with the message', async () => {
    /*
     * The bug this guards against: the effort was shown as a chip and described
     * as fixed at creation, so a reader could see "均衡" but never change it.
     * The Runtime now takes a per-turn override, and the control has to send it
     * — a picker that only moves its own label would be the same lie in a new
     * shape.
     */
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    /*
     * Driven the way a reader drives it: open the chip, read the rows, pick one.
     * Asserting on a `<select>`'s `.options` was the old test, and it passed
     * while the control opened a system menu that looked like nothing else on
     * the page — the assertions described the DOM, not the experience.
     */
    const trigger = screen.getByRole('button', { name: /^思考强度：/ });
    expect(trigger.textContent).toContain('均衡');
    fireEvent.click(trigger);

    const list = screen.getByRole('listbox', { name: '思考强度' });
    // Only the levels this model publishes, in the gateway's order.
    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual([
      expect.stringContaining('快速'),
      expect.stringContaining('均衡'),
      expect.stringContaining('深入'),
    ]);
    expect(within(list).getByRole('option', { selected: true }).textContent).toContain('均衡');

    fireEvent.mouseDown(within(list).getByText('深入'));
    // Choosing closes the list and returns focus to the chip that opened it.
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger.textContent).toContain('深入');

    fireEvent.change(screen.getByLabelText('输入消息'), { target: { value: '再问一句' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    const sent = await vi.waitFor(() => {
      const found = requests.find((request) => request.url.endsWith('/messages'));
      expect(found).toBeTruthy();
      return found!;
    });
    expect(JSON.parse(String(sent.init?.body))).toMatchObject({
      text: '再问一句',
      reasoningEffort: 'high',
    });
  });

  it('switches model inside the conversation instead of starting a new one', async () => {
    /*
     * The behaviour this replaces: changing the model started a fresh
     * conversation, so the transcript was the price of changing one field. The
     * switch now travels with the next message, and the thread above it stays.
     */
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '模型：Fixture' }));
    const list = screen.getByRole('listbox', { name: '模型' });
    fireEvent.mouseDown(within(list).getByText('Alt'));

    // The chip reflects the intended model, and nothing has been sent yet.
    expect(screen.getByRole('button', { name: '模型：Alt' })).toBeTruthy();
    expect(requests.some((request) => request.url.endsWith('/messages'))).toBe(false);

    /*
     * The level menu must now describe the *new* model: `none/low/high/max`,
     * which has no `medium` at all. A stale menu here would let the reader pick
     * a level the next turn cannot use.
     */
    const effortTrigger = screen.getByRole('button', { name: /^思考强度：/ });
    fireEvent.click(effortTrigger);
    expect(within(screen.getByRole('listbox', { name: '思考强度' }))
      .getAllByRole('option').map((option) => option.textContent?.replace(/.*?(不思考|快速|深入|最强).*/, '$1')))
      .toEqual(['不思考', '快速', '深入', '最强']);
    fireEvent.keyDown(screen.getByRole('listbox', { name: '思考强度' }), { key: 'Escape' });

    // The same conversation, still on screen.
    expect(screen.getByText('发布已通过。')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('输入消息'), { target: { value: '换个模型再问' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    const sent = await vi.waitFor(() => {
      const found = requests.find((request) => request.url.endsWith('/messages'));
      expect(found).toBeTruthy();
      return found!;
    });
    expect(JSON.parse(String(sent.init?.body))).toMatchObject({
      text: '换个模型再问',
      modelOverride: { providerId: 'magpie', modelId: 'fixture/alt-model' },
    });
  });

  it('shows no effort menu when the model publishes no levels, and says so', async () => {
    /*
     * A model without levels cannot honour a choice. Rendering a menu anyway is
     * the failure mode this replaces: the reader changes a value, nothing about
     * the answer changes, and the setting loses credibility.
     */
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/health') return Promise.resolve(json({ status: 'ok', service: 'conchbase', apiVersion: 1 }));
      if (path === '/v1/runtime') return Promise.resolve(json(runtime));
      if (path === '/v1/agent-chat/agents') {
        return Promise.resolve(json({ version: '1.9.0', agents: [{
          id: 'agt_alpha', name: '研究助手', currentRevisionId: 'agr_alpha',
          providerId: 'magpie', modelId: 'fixture/chat-model', isDefault: true, archived: false,
        }] }));
      }
      if (path === '/v1/model-catalog') {
        // No `reasoningLevels`: the gateway says nothing about effort.
        return Promise.resolve(json({ models: [{
          providerId: 'magpie', modelId: 'fixture/chat-model',
          reference: 'magpie:fixture/chat-model', displayName: 'Fixture', capabilities: ['chat'],
        }] }));
      }
      if (path.startsWith('/v1/agent-chat/conversations?limit=')) {
        return Promise.resolve(json({ version: '1.9.0', conversations: [], defaultModelId: null }));
      }
      return Promise.resolve(json({ error: 'not found' }, 404));
    }));
    render(<AgentApp />);
    expect(await screen.findByRole('heading', { name: /和 研究助手 说点什么/ })).toBeTruthy();
    expect(screen.queryByLabelText('思考强度')).toBeNull();
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

  it('shows one activity timeline in the context panel', async () => {
    const withActivity = conversation();
    withActivity.messages[1]!.activity = [
      { id: 'act_diag', kind: 'tool', label: '读取文件', state: 'succeeded', detail: 'notes.md' },
      { id: 'act_write', kind: 'approval', label: '等待审批：workspace_write', state: 'waiting_approval', detail: '风险：write' },
    ] as never;
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/health') return Promise.resolve(json({ status: 'ok', service: 'conchbase', apiVersion: 1 }));
      if (path === '/v1/runtime') return Promise.resolve(json(runtime));
      if (path === '/v1/agent-chat/agents') {
        return Promise.resolve(json({ version: '1.9.0', agents: [{
          id: 'agt_alpha', name: '研究助手', currentRevisionId: 'agr_alpha',
          providerId: 'magpie', modelId: 'fixture/chat-model', isDefault: true, archived: false,
        }] }));
      }
      if (path === '/v1/model-catalog') return Promise.resolve(json({ models: [] }));
      if (path.startsWith('/v1/agent-chat/conversations?limit=')) {
        return Promise.resolve(json({ version: '1.9.0', conversations: [{
          id: conversationId, agentId: 'agt_alpha', reasoningEffort: null,
          createdAt: '2026-11-16T00:00:00.000Z', messageCount: 2, lastMessagePreview: '帮我看一下发布状态',
        }], defaultModelId: null }));
      }
      if (path === `/v1/agent-chat/conversations/${conversationId}`) return Promise.resolve(json(withActivity));
      return Promise.resolve(json({ error: 'not found' }, 404));
    }));
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '上下文' }));
    const panel = screen.getByRole('complementary', { name: '对话上下文' });
    expect(within(panel).getByRole('heading', { name: '发生了什么' })).toBeTruthy();
    expect(within(panel).getByText('等待你批准')).toBeTruthy();
    expect(within(panel).getByText(/notes\.md/)).toBeTruthy();
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
    // The close button vanished with the panel: focus must land back on the
    // control that owns it, not on <body>.
    expect(document.activeElement).toBe(toggle);
  });

  it('opens a diagnostics drawer from the Agent surface without switching pages', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    const toggle = screen.getByRole('button', { name: '诊断' });
    fireEvent.click(toggle);

    const drawer = await screen.findByRole('dialog', { name: '诊断与支持' });
    expect(within(drawer).getByText('数据与诊断')).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(requests.some((request) => request.url === '/v1/operations/data')).toBe(true);
  });

  it('returns focus from the diagnostics drawer to its trigger', async () => {
    render(<AgentApp />);
    expect(await screen.findByText('发布已通过。')).toBeTruthy();

    const toggle = screen.getByRole('button', { name: '诊断' });
    fireEvent.click(toggle);
    const close = await screen.findByRole('button', { name: '关闭诊断' });
    expect(document.activeElement).toBe(close);

    fireEvent.click(close);
    expect(screen.queryByRole('dialog', { name: '诊断与支持' })).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

});
