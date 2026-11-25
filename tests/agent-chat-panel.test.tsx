// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentChatPanel } from '../src/features/agent-chat/AgentChatPanel.js';
import { AgentChatThread } from '../src/features/agent-chat/AgentChatThread.js';
import type { AgentChatMessage } from '../src/shared/api/agent-chat.js';
import type { RuntimeInfo } from '../src/shared/api/runtime.js';

const runtime: RuntimeInfo = {
  name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [],
  agentChatContract: '1.9.0', agentChatPaths: 7,
};

const conversation = {
  version: '1.9.0',
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
        return Promise.resolve(json({ version: '1.9.0', agents: [{
          id: 'boss-agent', name: 'Boss Agent', currentRevisionId: 'boss-runtime-v1',
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
        return Promise.resolve(json({ version: '1.9.0', conversations: [], defaultModelId: null }));
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
          version: '1.9.0',
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
    render(<AgentChatThread messages={messages} agentName="Boss Agent" busy={false} onDecision={() => undefined} />);
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

  it('keeps the approval buttons reachable while a request is in flight', () => {
    /*
     * `busy` is a request in flight somewhere in this conversation, not "this
     * message is waiting for a decision" — a reader sending a new message must
     * still be able to answer the approval in front of them. A `disabled`
     * button also leaves the tab order, and the approval is the only way out of
     * a blocked task, so a keyboard reader would be stuck. The button stays
     * focusable and declines the click instead.
     */
    const onDecision = vi.fn();
    render(
      <AgentChatThread
        messages={[{
          id: `amsg_${'5'.repeat(24)}`, sequence: 1, author: 'assistant', body: '',
          state: 'waiting_approval', taskId: 'task_gamma', error: null, phase: 'human',
          progress: null, updatedAt: '2026-11-15T00:00:00.000Z', replyToId: null,
          activity: [{ id: 'approval-3', kind: 'approval', label: '等待审批：workspace_write', state: 'waiting_approval', detail: null }],
        }]}
        agentName="文件助手"
        busy
        onDecision={onDecision}
      />,
    );
    const approve = screen.getByRole('button', { name: '批准并继续' });
    const reject = screen.getByRole('button', { name: '拒绝' });
    expect(approve.getAttribute('aria-disabled')).toBe('true');
    expect(approve.hasAttribute('disabled')).toBe(false);
    expect(reject.getAttribute('aria-disabled')).toBe('true');
    expect(reject.hasAttribute('disabled')).toBe(false);
    // A reader who reaches the button needs to know why it declined, not just
    // that nothing happened. Both buttons point at that sentence.
    const describedBy = approve.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toContain('稍后');
    expect(reject.getAttribute('aria-describedby')).toBe(describedBy);
    approve.focus();
    expect(document.activeElement).toBe(approve);
    fireEvent.click(approve);
    fireEvent.click(reject);
    expect(onDecision).not.toHaveBeenCalled();
  });

  it('says a turn was submitted while the previous reply was still being written', () => {
    /*
     * The timestamps are the shape the Runtime produces when a question arrives
     * mid-reply (measured): the first answer's last update lands after the
     * second question. The note states that fact and nothing else — it must not
     * claim the two replies were written without knowing about each other,
     * because a queued turn is given the answer in front of it.
     */
    const messages: readonly AgentChatMessage[] = [
      { id: 'u1', sequence: 1, author: 'user', body: '先看 A', state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-20T15:55:00.000Z', replyToId: null, activity: [] },
      { id: 'a1', sequence: 2, author: 'assistant', body: '这是 A 的回复', state: 'replied', taskId: 'task_a', error: null, phase: 'terminal', progress: 100, updatedAt: '2026-11-20T15:55:09.000Z', replyToId: 'u1', activity: [] },
      { id: 'u2', sequence: 3, author: 'user', body: '顺便也看 B', state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-20T15:55:01.000Z', replyToId: null, activity: [] },
      { id: 'a2', sequence: 4, author: 'assistant', body: '这是 B 的回复', state: 'replied', taskId: 'task_b', error: null, phase: 'terminal', progress: 100, updatedAt: '2026-11-20T15:55:03.000Z', replyToId: 'u2', activity: [] },
    ];
    render(<AgentChatThread messages={messages} agentName="助手" busy={false} onDecision={() => undefined} />);
    const notes = screen.getAllByText(/上一条回复生成中时发出/);
    // Only the second question was asked mid-reply; the first waited for nothing.
    expect(notes).toHaveLength(1);
    // The note names no turn: a `sequence` can skip (a Runtime notice occupies
    // one), so a number would point at the wrong message.
    expect(notes[0]?.textContent).toBe('上一条回复生成中时发出');
  });

  it('distinguishes a queued reply from one the Runtime has started', () => {
    /*
     * A turn asked mid-reply is queued, not run. The Runtime writes it as
     * `pending` with no task, and only assigns a task when the turn leaves the
     * queue — at which point it becomes `thinking`. Three questions in a row
     * therefore show three "正在准备…" today, while only one is being worked on.
     *
     * `taskId === null` is the separator, and it is a definition rather than a
     * coincidence: an assistant message with a task has been handed to the
     * executor, and one without has not been started.
     */
    const messages: readonly AgentChatMessage[] = [
      { id: 'u1', sequence: 1, author: 'user', body: '第一个问题', state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-20T15:55:00.000Z', replyToId: null, activity: [] },
      // Running: the Runtime has a task for it.
      { id: 'a1', sequence: 2, author: 'assistant', body: '', state: 'thinking', taskId: 'task_running', error: null, phase: 'preparing', progress: null, updatedAt: '2026-11-20T15:55:01.000Z', replyToId: 'u1', activity: [] },
      { id: 'u2', sequence: 3, author: 'user', body: '第二个问题', state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-20T15:55:02.000Z', replyToId: null, activity: [] },
      // Queued: accepted, but not started.
      { id: 'a2', sequence: 4, author: 'assistant', body: '', state: 'pending', taskId: null, error: null, phase: 'preparing', progress: null, updatedAt: '2026-11-20T15:55:03.000Z', replyToId: 'u2', activity: [] },
    ];
    const { container } = render(
      <AgentChatThread messages={messages} agentName="助手" busy={false} onDecision={() => undefined} />,
    );
    const queued = container.querySelectorAll('.agent-chat-state-pending');
    expect(queued).toHaveLength(1);
    expect(queued[0]?.textContent).toContain('排队中');
    // The running one keeps its own label; it is not queued.
    expect(screen.getByText('正在思考…')).toBeTruthy();
    expect(screen.queryByText('正在准备…')).toBeNull();
  });

  it('does not replay the arrival animation for history already on screen', () => {
    /*
     * The arrival animation says "this appeared in the thread". Reopening a
     * conversation mounts every message at once, so all sixteen played it
     * together — the whole column faded in and rose 6px on load, which reads as
     * a repaint rather than as one message arriving. Measured on the running
     * app: sixteen articles, all mid-animation, opacities matching.
     *
     * The scroll effect already distinguishes the first render from a later
     * addition; the animation did not. History is drawn quiet, and only a
     * message that arrives after the first render animates.
     */
    const messages: readonly AgentChatMessage[] = [
      { id: 'u1', sequence: 1, author: 'user', body: 'A', state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-20T15:55:00.000Z', replyToId: null, activity: [] },
      { id: 'a1', sequence: 2, author: 'assistant', body: '答 A', state: 'replied', taskId: 'task_a', error: null, phase: 'terminal', progress: 100, updatedAt: '2026-11-20T15:55:02.000Z', replyToId: 'u1', activity: [] },
    ];
    const { container } = render(
      <AgentChatThread messages={messages} agentName="助手" busy={false} onDecision={() => undefined} />,
    );
    expect(container.querySelector('.agent-chat-thread')?.className).toContain('is-settled');
  });

  it('animates a message that arrives after the thread is open', () => {
    const first: readonly AgentChatMessage[] = [
      { id: 'u1', sequence: 1, author: 'user', body: 'A', state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-20T15:55:00.000Z', replyToId: null, activity: [] },
    ];
    const grown: readonly AgentChatMessage[] = [
      ...first,
      { id: 'a1', sequence: 2, author: 'assistant', body: '答 A', state: 'replied', taskId: 'task_a', error: null, phase: 'terminal', progress: 100, updatedAt: '2026-11-20T15:55:02.000Z', replyToId: 'u1', activity: [] },
    ];
    const { container, rerender } = render(
      <AgentChatThread messages={first} agentName="助手" busy={false} onDecision={() => undefined} />,
    );
    /* Settled after the first paint, so the next arrival is the only one that moves. */
    expect(container.querySelector('.agent-chat-thread')?.className).toContain('is-settled');
    rerender(<AgentChatThread messages={grown} agentName="助手" busy={false} onDecision={() => undefined} />);
    const arrived = container.querySelectorAll('article.agent-chat-message');
    expect(arrived).toHaveLength(2);
  });

  it('does not annotate a conversation where every question waited', () => {
    const messages: readonly AgentChatMessage[] = [
      { id: 'u1', sequence: 1, author: 'user', body: 'A', state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-20T15:55:00.000Z', replyToId: null, activity: [] },
      { id: 'a1', sequence: 2, author: 'assistant', body: '答 A', state: 'replied', taskId: 'task_a', error: null, phase: 'terminal', progress: 100, updatedAt: '2026-11-20T15:55:02.000Z', replyToId: 'u1', activity: [] },
      { id: 'u2', sequence: 3, author: 'user', body: 'B', state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-20T15:55:04.000Z', replyToId: null, activity: [] },
      { id: 'a2', sequence: 4, author: 'assistant', body: '答 B', state: 'replied', taskId: 'task_b', error: null, phase: 'terminal', progress: 100, updatedAt: '2026-11-20T15:55:06.000Z', replyToId: 'u2', activity: [] },
    ];
    render(<AgentChatThread messages={messages} agentName="助手" busy={false} onDecision={() => undefined} />);
    expect(screen.queryByText(/上一条回复生成中时发出/)).toBeNull();
  });

  it('does not claim the two replies were written without knowing about each other', () => {
    /*
     * This is the assertion that keeps the note honest after queueing.
     *
     * A queued turn is handed the transcript as it stands when it runs, which
     * includes the answer in front of it — so the later reply does know what
     * the earlier one said. The note is only allowed to report when the
     * question was submitted. Wording that implies isolation ("互不知情",
     * "没有看到", "各自生成") would be false for every queued turn, and this
     * test is what stops that wording from coming back.
     */
    const messages: readonly AgentChatMessage[] = [
      { id: 'u1', sequence: 1, author: 'user', body: '先看 A', state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-20T15:55:00.000Z', replyToId: null, activity: [] },
      { id: 'a1', sequence: 2, author: 'assistant', body: '答 A', state: 'replied', taskId: 'task_a', error: null, phase: 'terminal', progress: 100, updatedAt: '2026-11-20T15:55:09.000Z', replyToId: 'u1', activity: [] },
      { id: 'u2', sequence: 3, author: 'user', body: '顺便也看 B', state: 'published', taskId: null, error: null, phase: 'accepted', progress: null, updatedAt: '2026-11-20T15:55:01.000Z', replyToId: null, activity: [] },
      { id: 'a2', sequence: 4, author: 'assistant', body: '答 B', state: 'replied', taskId: 'task_b', error: null, phase: 'terminal', progress: 100, updatedAt: '2026-11-20T15:55:03.000Z', replyToId: 'u2', activity: [] },
    ];
    const { container } = render(
      <AgentChatThread messages={messages} agentName="助手" busy={false} onDecision={() => undefined} />,
    );
    const note = container.querySelector('.agent-chat-concurrent-note');
    expect(note).toBeTruthy();
    const text = note?.textContent ?? '';
    for (const claim of ['互不知情', '没有看到', '各自', '不知道']) {
      expect(text, `the note must not assert isolation: ${claim}`).not.toContain(claim);
    }
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
      agentName="Boss Agent"
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
    const bossCard = await screen.findByRole('button', { name: /Boss Agent/ });
    expect(bossCard).toBeTruthy();
    fireEvent.click(bossCard);
    fireEvent.click(await screen.findByRole('button', { name: '开启新对话' }));
    expect(await screen.findByText(/Boss Agent：直接对话/)).toBeTruthy();
    expect(await screen.findByText(/未接入网页搜索/)).toBeTruthy();
  });

  it('shows a bounded unsupported Runtime state', async () => {
    render(<AgentChatPanel runtime={{
      ...runtime, agentChatContract: undefined, agentChatPaths: undefined,
    }} />);
    expect(await screen.findByText(/agentChatContract: 1\.8\.0/)).toBeTruthy();
  });
});
