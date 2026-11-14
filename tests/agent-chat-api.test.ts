import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AGENT_CHAT_PUBLIC_PATHS,
  createAgentChatConversation,
  getAgentChatConversation,
  isBossAgent,
  listAgentChatAgents,
  postAgentChatMessage,
  supportsAgentChat,
} from '../src/shared/api/agent-chat.js';
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
  messages: [{
    id: `amsg_${'b'.repeat(24)}`,
    sequence: 1,
    author: 'user',
    body: '你好',
    state: 'published',
    taskId: null,
    error: null,
  }],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('agent chat typed client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === '/v1/agent-chat/agents') {
        return Promise.resolve(json({ version: '1.5.0', agents: [
          {
            id: 'agt_alpha', name: '中文助手', currentRevisionId: 'agr_alpha',
            providerId: 'magpie', modelId: 'fixture/chat-model', isDefault: true, archived: false,
          },
          {
            id: 'boss-agent', name: '老板 Agent', currentRevisionId: 'boss-runtime-v1',
            providerId: 'runtime', modelId: '组织编排', isDefault: false, archived: false,
          },
        ] }));
      }
      if (path === '/v1/agent-chat/conversations' && init?.method === 'POST') return Promise.resolve(json(conversation, 201));
      if (path === `/v1/agent-chat/conversations/${conversation.id}` && init?.method === undefined) {
        return Promise.resolve(json(conversation));
      }
      if (path === `/v1/agent-chat/conversations/${conversation.id}/messages`) {
        return Promise.resolve(json({
          version: '1.5.0',
          conversationId: conversation.id,
          userMessage: conversation.messages[0],
          assistantMessage: {
            ...conversation.messages[0],
            id: `amsg_${'c'.repeat(24)}`,
            sequence: 2,
            author: 'assistant',
            body: '',
            state: 'pending',
            taskId: 'task_alpha',
          },
        }, 202));
      }
      return Promise.resolve(json({ error: 'not found' }, 404));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('gates on 1.5.0 discovery and publishes the exact four paths', () => {
    expect(supportsAgentChat(runtime)).toBe(true);
    expect(supportsAgentChat({ ...runtime, agentChatPaths: 3 })).toBe(false);
    expect(AGENT_CHAT_PUBLIC_PATHS).toHaveLength(4);
  });

  it('prefers the Runtime-owned Boss Agent', async () => {
    const agents = await listAgentChatAgents();
    expect(agents[0]?.id).toBe('boss-agent');
    expect(isBossAgent(agents[0]!)).toBe(true);
  });

  it('creates, reads, and writes Agent Chat conversations', async () => {
    await expect(listAgentChatAgents()).resolves.toHaveLength(2);
    await expect(createAgentChatConversation({ agentId: 'agt_alpha' })).resolves.toMatchObject({ id: conversation.id });
    await expect(getAgentChatConversation(conversation.id)).resolves.toMatchObject({ agentId: 'agt_alpha' });
    await expect(postAgentChatMessage(conversation.id, { text: '你好', idempotencyKey: 'key' }))
      .resolves.toMatchObject({ assistantMessage: { state: 'pending' } });
  });
});
