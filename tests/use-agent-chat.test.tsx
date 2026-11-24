// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgentChat } from '../src/features/agent-chat/useAgentChat.js';
import type { RuntimeInfo } from '../src/shared/api/runtime.js';

/*
 * The controller had no tests of its own — only its panels' tests, which
 * exercise it through whatever that panel happens to call. Splitting it means
 * moving state between hooks, and "the panels still render" cannot tell a
 * moved-but-intact state from one that now resets on a re-render.
 *
 * These pin the contract the panels rely on, so the split has something to be
 * wrong against.
 */

const runtime: RuntimeInfo = {
  name: 'Conchbase', version: '1.0.0', state: 'ready', capabilities: [],
  agentChatContract: '1.9.0', agentChatPaths: 7,
} as RuntimeInfo;

const AGENT = {
  id: 'agt_alpha', name: '助手', currentRevisionId: 'agr_alpha',
  providerId: 'magpie', modelId: 'fixture/model', isDefault: true, archived: false,
};
const MODEL = {
  providerId: 'magpie', modelId: 'fixture/model', reference: 'magpie:fixture/model',
  displayName: 'Fixture',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** Serve the catalogue a Boss conversation needs, by path. */
function serveChat(overrides: (url: string, init?: RequestInit) => Response | undefined = () => undefined) {
  return (path: string, init?: RequestInit) => {
    /* History is read with a `?limit=` query, so match the route, not the end. */
    const url = String(path);
    const route = url.split('?')[0]!;
    const custom = overrides(route, init);
    if (custom) return Promise.resolve(custom);
    if (route.endsWith('/v1/agent-chat/agents')) return Promise.resolve(json({ version: '1.9.0', agents: [AGENT] }));
    if (route.includes('/v1/model-catalog')) return Promise.resolve(json({ models: [MODEL] }));
    if (route.endsWith('/v1/agent-chat/conversations')) {
      return Promise.resolve(json({ version: '1.9.0', conversations: [] }));
    }
    return Promise.resolve(json({}));
  };
}

function conversation(id: string, messages: readonly unknown[] = []) {
  return {
    version: '1.9.0', id, agentId: AGENT.id, agentRevisionId: AGENT.currentRevisionId,
    providerId: 'magpie', modelId: 'fixture/model', configurationRevisionId: 'cfg_a',
    reasoningEffort: 'medium', messages,
  };
}

describe('useAgentChat', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', { randomUUID: () => 'fixture-uuid' });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('publishes the agent list and the chosen agent together', async () => {
    /*
     * These two land in one commit on purpose. Selecting the Agent after the
     * catalogue await left one render where the list existed and the selection
     * was still empty, and the landing prompt read that as "no usable Agent"
     * and disabled the input.
     */
    vi.stubGlobal('fetch', vi.fn(serveChat()));
    const { result } = renderHook(() => useAgentChat(runtime));
    await waitFor(() => expect(result.current.agents).toHaveLength(1));
    expect(result.current.selectedAgentId).toBe(AGENT.id);
    expect(result.current.selectedModelReference).toBe(MODEL.reference);
  });

  it('stays unsupported and reads nothing when the Runtime lacks the contract', async () => {
    const fetchMock = vi.fn(serveChat());
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAgentChat({ ...runtime, agentChatContract: undefined } as RuntimeInfo));
    expect(result.current.supported).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens a new conversation on start and clears it on reset', async () => {
    vi.stubGlobal('fetch', vi.fn(serveChat((url, init) => {
      if (url.endsWith('/v1/agent-chat/conversations') && init?.method === 'POST') {
        return json(conversation('chat_one'), 201);
      }
      return undefined;
    })));
    const { result } = renderHook(() => useAgentChat(runtime));
    await waitFor(() => expect(result.current.selectedAgentId).toBe(AGENT.id));

    await act(async () => { await result.current.startConversation(); });
    expect(result.current.conversation?.id).toBe('chat_one');

    act(() => result.current.resetConversation());
    expect(result.current.conversation).toBeNull();
  });

  it('keeps a draft per conversation, and restores it on return', async () => {
    /*
     * A draft belongs to the conversation it was written in. Losing it when the
     * reader opens history and comes back is the one loss they cannot undo —
     * and it is held in memory only, because the client boundary forbids
     * browser storage.
     */
    vi.stubGlobal('fetch', vi.fn(serveChat((url) => {
      if (url.endsWith('/v1/agent-chat/conversations/chat_a')) {
        return json(conversation('chat_a'));
      }
      if (url.endsWith('/v1/agent-chat/conversations/chat_b')) {
        return json(conversation('chat_b'));
      }
      return undefined;
    })));
    const { result } = renderHook(() => useAgentChat(runtime));
    await waitFor(() => expect(result.current.selectedAgentId).toBe(AGENT.id));

    await act(async () => { await result.current.resumeConversation('chat_a'); });
    act(() => result.current.setDraft('写给 A 的话'));
    expect(result.current.draft).toBe('写给 A 的话');

    await act(async () => { await result.current.resumeConversation('chat_b'); });
    expect(result.current.draft).toBe('');
    act(() => result.current.setDraft('写给 B 的话'));

    await act(async () => { await result.current.resumeConversation('chat_a'); });
    expect(result.current.draft).toBe('写给 A 的话');
  });

  it('choosing an agent clears any error but keeps the conversation', async () => {
    vi.stubGlobal('fetch', vi.fn(serveChat((url, init) => {
      if (url.endsWith('/v1/agent-chat/conversations') && init?.method === 'POST') {
        return json(conversation('chat_one'), 201);
      }
      return undefined;
    })));
    const { result } = renderHook(() => useAgentChat(runtime));
    await waitFor(() => expect(result.current.selectedAgentId).toBe(AGENT.id));
    await act(async () => { await result.current.startConversation(); });

    act(() => result.current.selectAgent('agt_other'));
    expect(result.current.selectedAgentId).toBe('agt_other');
    expect(result.current.error).toBeNull();
  });

  it('resetting for a new conversation returns to the boss agent', async () => {
    const boss = {
      id: 'boss-agent', name: '老板 Agent', currentRevisionId: 'agr_boss',
      providerId: 'runtime', modelId: '组织编排', isDefault: false, archived: false,
    };
    vi.stubGlobal('fetch', vi.fn(serveChat((url) => {
      if (url.endsWith('/v1/agent-chat/agents')) {
        return json({ version: '1.9.0', agents: [AGENT, boss] });
      }
      return undefined;
    })));
    const { result } = renderHook(() => useAgentChat(runtime));
    await waitFor(() => expect(result.current.selectedAgentId).toBe(boss.id));

    act(() => result.current.selectAgent(AGENT.id));
    expect(result.current.selectedAgentId).toBe(AGENT.id);

    act(() => result.current.resetConversation());
    expect(result.current.selectedAgentId).toBe(boss.id);
  });

  it('reports hasPending only while the Runtime still owes a reply', async () => {
    const pending = conversation('chat_a', [
      {
        id: 'm1', sequence: 1, author: 'assistant', body: '', state: 'thinking',
        taskId: 'task_a', error: null, phase: 'preparing', progress: null,
        updatedAt: '2026-11-20T00:00:00.000Z', replyToId: null, activity: [],
      },
    ]);
    vi.stubGlobal('fetch', vi.fn(serveChat((url) => {
      if (url.endsWith('/v1/agent-chat/conversations/chat_a')) return json(pending);
      return undefined;
    })));
    const { result } = renderHook(() => useAgentChat(runtime));
    await waitFor(() => expect(result.current.selectedAgentId).toBe(AGENT.id));
    await act(async () => { await result.current.resumeConversation('chat_a'); });
    expect(result.current.hasPending).toBe(true);
  });

  it('restores the newest thread that has messages when told to resume', async () => {
    /*
     * The Runtime lists newest-created first, so its head is often a
     * conversation the reader opened and abandoned. Resuming that would look
     * like a broken screen.
     */
    vi.stubGlobal('fetch', vi.fn(serveChat((url) => {
      if (url.endsWith('/v1/agent-chat/conversations/chat_full')) return json(conversation('chat_full'));
      if (url.endsWith('/v1/agent-chat/conversations')) {
        return json({
          version: '1.9.0',
          defaultModelId: 'fixture/model',
          conversations: [
            { id: 'chat_empty', agentId: AGENT.id, reasoningEffort: 'medium', createdAt: '2026-11-20T02:00:00.000Z', messageCount: 0, unread: false, lastState: 'published', lastMessagePreview: '' },
            { id: 'chat_full', agentId: AGENT.id, reasoningEffort: 'medium', createdAt: '2026-11-20T01:00:00.000Z', messageCount: 4, unread: false, lastState: 'replied', lastMessagePreview: '你好' },
          ],
        });
      }
      return undefined;
    })));
    const { result } = renderHook(() => useAgentChat(runtime, { autoResume: true }));
    await waitFor(() => expect(result.current.conversation?.id).toBe('chat_full'));
  });
});
