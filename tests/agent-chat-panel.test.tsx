// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentChatPanel } from '../src/features/agent-chat/AgentChatPanel.js';
import { AgentChatThread } from '../src/features/agent-chat/AgentChatThread.js';
import type { AgentChatMessage } from '../src/shared/api/agent-chat.js';
import type { RuntimeInfo } from '../src/shared/api/runtime.js';

const runtime: RuntimeInfo = {
  name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [],
  agentChatContract: '1.8.0', agentChatPaths: 6,
};

const conversation = {
  version: '1.8.0',
  id: `chat_${'a'.repeat(24)}`,
  agentId: 'agt_alpha',
  agentRevisionId: 'agr_alpha',
  providerId: 'magpie',
  modelId: 'fixture/chat-model',
  reasoningEffort: 'medium',
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
        return Promise.resolve(json({ version: '1.8.0', agents: [{
          id: 'boss-agent', name: '老板 Agent', currentRevisionId: 'boss-runtime-v1',
          providerId: 'runtime', modelId: '组织编排', isDefault: false, archived: false,
        }, {
          id: 'agt_alpha', name: '中文助手', currentRevisionId: 'agr_alpha',
          providerId: 'magpie', modelId: 'fixture/chat-model', isDefault: true, archived: false,
        }] }));
      }
      if (path === '/v1/model-catalog') {
        return Promise.resolve(json({ models: [{
          providerId: 'magpie', modelId: 'fixture/chat-model',
          reference: 'magpie:fixture/chat-model', displayName: 'Fixture Chat Model', capabilities: ['chat'],
        }, {
          providerId: 'magpie', modelId: 'fixture/alt-model',
          reference: 'magpie:fixture/alt-model', displayName: 'Alternate Chat Model', capabilities: ['chat'],
        }] }));
      }
      if (path.startsWith('/v1/agent-chat/conversations?limit=')) {
        return Promise.resolve(json({ version: '1.8.0', conversations: [], defaultModelId: null }));
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
            state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-14T00:00:00.000Z', replyToId: null, activity: [],
          }, {
            id: `amsg_${'c'.repeat(24)}`, sequence: 2, author: 'assistant', body: '你好，我是 Agent。',
            state: 'replied', taskId: 'task_alpha', error: null, phase: 'terminal', progress: 100, updatedAt: '2026-11-14T00:00:00.000Z', replyToId: null, activity: [],
          }],
        }));
      }
      if (path === `/v1/agent-chat/conversations/${conversation.id}/messages`) {
        return Promise.resolve(json({
          version: '1.8.0',
          conversationId: conversation.id,
          userMessage: {
            id: `amsg_${'b'.repeat(24)}`, sequence: 1, author: 'user', body: '你好',
            state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-14T00:00:00.000Z', replyToId: null, activity: [],
          },
          assistantMessage: {
            id: `amsg_${'c'.repeat(24)}`, sequence: 2, author: 'assistant', body: '你好，我是 Agent。',
            state: 'replied', taskId: 'task_alpha', error: null, phase: 'terminal', progress: 100, updatedAt: '2026-11-14T00:00:00.000Z', replyToId: null, activity: [],
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
    expect(await screen.findByRole('heading', { name: '选择 Agent' })).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: '开启新对话' }));
    const input = await screen.findByLabelText('输入消息');
    // The landing panel is gone once a conversation is active.
    expect(screen.queryByRole('heading', { name: '选择 Agent' })).toBeNull();
    fireEvent.change(input, { target: { value: '你好' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('你好，我是 Agent。')).toBeTruthy());
    expect(screen.getByText('你好')).toBeTruthy();
  });

  it('lists Magpie models during setup and sends the selected model override', async () => {
    render(<AgentChatPanel runtime={runtime} />);
    const modelSelect = await screen.findByLabelText('对话模型');
    expect(screen.getByRole('option', { name: /Alternate Chat Model/ })).toBeTruthy();
    fireEvent.change(modelSelect, { target: { value: 'magpie:fixture/alt-model' } });
    fireEvent.click(await screen.findByRole('button', { name: '开启新对话' }));
    await waitFor(() => {
      const call = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
        (entry) => String(entry[0]) === '/v1/agent-chat/conversations',
      );
      expect(JSON.parse(String((call?.[1] as RequestInit | undefined)?.body))).toMatchObject({
        modelOverride: { providerId: 'magpie', modelId: 'fixture/alt-model' },
      });
    });
  });

  it('renders thinking, organizing, waiting attention, and unavailable states', async () => {
    const messages: readonly AgentChatMessage[] = [
      { id: `amsg_${'d'.repeat(24)}`, sequence: 1, author: 'user', body: '问题', state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-14T00:00:00.000Z', replyToId: null, activity: [] },
      { id: `amsg_${'e'.repeat(24)}`, sequence: 2, author: 'assistant', body: '', state: 'thinking', taskId: null, error: null, phase: 'preparing', progress: null, updatedAt: '2026-11-14T00:00:00.000Z', replyToId: `amsg_${'d'.repeat(24)}`, activity: [] },
      { id: `amsg_${'f'.repeat(24)}`, sequence: 3, author: 'assistant', body: '正在汇总', state: 'organizing', taskId: null, error: null, phase: 'organization', progress: 25, updatedAt: '2026-11-14T00:00:00.000Z', replyToId: `amsg_${'d'.repeat(24)}`, activity: [] },
      { id: `amsg_${'0'.repeat(24)}`, sequence: 4, author: 'assistant', body: '需要确认', state: 'waiting_attention', taskId: null, error: null, phase: 'human', progress: null, updatedAt: '2026-11-14T00:00:00.000Z', replyToId: `amsg_${'d'.repeat(24)}`, activity: [] },
      { id: `amsg_${'1'.repeat(24)}`, sequence: 5, author: 'assistant', body: '目录不可用', state: 'unavailable', taskId: null, error: 'Model catalog is unavailable.', phase: 'terminal', progress: null, updatedAt: '2026-11-14T00:00:00.000Z', replyToId: `amsg_${'d'.repeat(24)}`, activity: [] },
    ];
    render(<AgentChatThread messages={messages} agentName="老板 Agent" busy={false} onDecision={() => undefined} />);
    expect(screen.getByText('正在思考…')).toBeTruthy();
    expect(screen.getByText('正在执行组织动作…')).toBeTruthy();
    expect(screen.getByText('等待你的确认')).toBeTruthy();
    expect(screen.getByText('模型服务暂不可用')).toBeTruthy();
    expect(screen.getByText('正在汇总')).toBeTruthy();
  });

  it('renders tool activity and asks for approval inline', async () => {
    const messages: readonly AgentChatMessage[] = [
      { id: `amsg_${'2'.repeat(24)}`, sequence: 1, author: 'user', body: '写文件', state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-15T00:00:00.000Z', replyToId: null, activity: [] },
      {
        id: `amsg_${'3'.repeat(24)}`,
        sequence: 2,
        author: 'assistant',
        body: '',
        state: 'waiting_approval',
        taskId: 'task_alpha',
        error: null,
        phase: 'human',
        progress: null,
        updatedAt: '2026-11-15T00:00:00.000Z',
        replyToId: `amsg_${'2'.repeat(24)}`,
        activity: [
          { id: 'turn-0', kind: 'turn', label: '第 1 轮', state: 'running', detail: null },
          { id: 'tool-1', kind: 'tool', label: '写入文件', state: 'running', detail: 'workspace_write' },
          {
            id: 'approval-1', kind: 'approval',
            label: '等待审批：workspace_write → notes/a.txt',
            state: 'waiting_approval', detail: '写入 notes/a.txt（风险：write）',
          },
          {
            id: 'approval-preview-1', kind: 'output', label: '将要发生的改动',
            state: 'waiting_approval', detail: '--- /dev/null\n+++ notes/a.txt\n+hello',
          },
        ],
      },
    ];
    const onDecision = vi.fn();
    render(
      <AgentChatThread
        messages={messages}
        agentName="文件助手"
        busy={false}
        onDecision={onDecision}
      />,
    );
    expect(screen.getByText('等待你批准工具调用')).toBeTruthy();
    expect(screen.getByText('等待你批准工具调用').closest('article')?.getAttribute('aria-busy')).toBe('false');
    const card = screen.getByRole('region', { name: '待批准的改动' });
    expect(card).toBeTruthy();
    expect(screen.getByText('等待审批：workspace_write → notes/a.txt')).toBeTruthy();
    expect(screen.getByText('写入 notes/a.txt（风险：write）')).toBeTruthy();
    expect(screen.getByText(/\+hello/).textContent).toContain('+hello');
    // The same two facts are in the card, not repeated in the plain activity list.
    expect(screen.getAllByText('写入 notes/a.txt（风险：write）')).toHaveLength(1);
    expect(screen.getByText('写入文件')).toBeTruthy();
    expect(screen.getByText('workspace_write')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '批准并继续' }));
    expect(onDecision).toHaveBeenCalledWith(`amsg_${'3'.repeat(24)}`, 'approved');
    fireEvent.click(screen.getByRole('button', { name: '拒绝' }));
    expect(onDecision).toHaveBeenCalledWith(`amsg_${'3'.repeat(24)}`, 'rejected');
  });

  it('still asks for approval when the Runtime published no preview', () => {
    render(
      <AgentChatThread
        messages={[{
          id: `amsg_${'4'.repeat(24)}`, sequence: 1, author: 'assistant', body: '',
          state: 'waiting_approval', taskId: 'task_beta', error: null, phase: 'human',
          progress: null, updatedAt: '2026-11-15T00:00:00.000Z', replyToId: null,
          activity: [{ id: 'approval-2', kind: 'approval', label: '等待审批：git_commit', state: 'waiting_approval', detail: null }],
        }]}
        agentName="文件助手"
        busy={false}
        onDecision={() => undefined}
      />,
    );
    expect(screen.getByRole('region', { name: '待批准的改动' })).toBeTruthy();
    expect(screen.getByText('等待审批：git_commit')).toBeTruthy();
    expect(screen.queryByRole('figure')).toBeNull();
    expect(screen.getByRole('button', { name: '批准并继续' })).toBeTruthy();
  });

  it('keeps Shift Enter as a newline and hides technical details by default', async () => {
    render(<AgentChatPanel runtime={runtime} />);
    fireEvent.click(await screen.findByRole('button', { name: '开启新对话' }));
    const input = await screen.findByLabelText('输入消息');
    fireEvent.change(input, { target: { value: '第一行' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect((input as HTMLTextAreaElement).value).toBe('第一行');
    expect(screen.queryByText('Agent revision')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '会话信息' }));
    expect(await screen.findByText('Agent revision')).toBeTruthy();
    expect(document.querySelector('.agent-chat-conversation')).toBeTruthy();
    expect(document.querySelector('.agent-chat-shell')).toBeTruthy();
  });

  it('renders a published project close-out report as sections', () => {
    const body = [
      '项目 project_alpha：2 名员工、3 份汇报（成功 2、失败 1）。',
      '成果：',
      '- 完成了 CLI 与 README。',
      '- 验证了统计结果。',
      '遗留问题：',
      '- 还有一份失败汇报。',
      '如需继续：',
      '- 恢复项目并派发新任务。',
    ].join('\n');
    render(<AgentChatThread
      messages={[{
        id: `amsg_${'5'.repeat(24)}`, sequence: 1, author: 'assistant', body,
        state: 'replied', taskId: null, error: null, phase: 'terminal', progress: null,
        updatedAt: '2026-11-16T00:00:00.000Z', replyToId: null, activity: [],
      }]}
      agentName="老板 Agent"
      busy={false}
      onDecision={() => undefined}
    />);

    expect(screen.getByText('项目 project_alpha：2 名员工、3 份汇报（成功 2、失败 1）。')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '成果' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '遗留问题' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '如需继续' })).toBeTruthy();
    expect(screen.getByText('完成了 CLI 与 README。')).toBeTruthy();
  });

  it('labels the Runtime-owned Boss Agent as organization orchestration', async () => {
    render(<AgentChatPanel runtime={runtime} />);
    const bossCard = await screen.findByRole('button', { name: /老板 Agent/ });
    expect(bossCard).toBeTruthy();
    fireEvent.click(bossCard);
    fireEvent.click(await screen.findByRole('button', { name: '开启新对话' }));
    expect(await screen.findByText(/老板 Agent：直接对话/)).toBeTruthy();
    expect(await screen.findByText(/未接入网页搜索/)).toBeTruthy();
  });

  it('shows a bounded unsupported Runtime state', async () => {
    render(<AgentChatPanel runtime={{
      ...runtime, agentChatContract: undefined, agentChatPaths: undefined,
    }} />);
    expect(await screen.findByText(/agentChatContract: 1\.8\.0/)).toBeTruthy();
  });
});
