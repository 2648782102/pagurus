import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  conversationKindLabel,
  conversationMessageLabel,
  CONVERSATION_PUBLIC_PATHS,
  getConversationMessages,
  getPrimaryConversation,
  supportsConversationContract,
  type ConversationMessage,
} from '../src/shared/api/conversation.js';
import type { RuntimeInfo } from '../src/shared/api/runtime.js';

const message: ConversationMessage = {
  version: '1.4.0',
  id: `msg_${'a'.repeat(24)}`,
  sequence: 1,
  kind: 'user_message',
  author: 'user',
  body: 'Start project atlas and hire worker planner.',
  state: 'published',
  createdByEventId: 'evt_alpha',
  projectId: 'project_atlas',
  workerId: null,
  reportId: null,
  attentionId: null,
  expectedVersion: null,
};

const view = {
  version: '1.4.0',
  bossSessionId: 'boss_alpha',
  messageCount: 1,
  nextCursor: message.id,
  hasMore: false,
  messages: [message],
};

const page = {
  version: '1.4.0',
  messages: [message],
  nextCursor: message.id,
  hasMore: false,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('primary conversation typed client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/organization/conversation') return Promise.resolve(json(view));
      if (path.startsWith('/v1/organization/conversation/messages')) return Promise.resolve(json(page));
      return Promise.resolve(json({ error: 'not found' }, 404));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('gates on optional 1.4.0 discovery and publishes the exact two paths', () => {
    const runtime: RuntimeInfo = {
      name: 'Conchbase',
      version: '1.0.0',
      state: 'ready',
      capabilities: [],
      conversationContract: '1.4.0',
      conversationPaths: 2,
    };
    expect(supportsConversationContract(runtime)).toBe(true);
    expect(supportsConversationContract({ ...runtime, conversationPaths: 1 })).toBe(false);
    expect(CONVERSATION_PUBLIC_PATHS).toEqual([
      '/v1/organization/conversation',
      '/v1/organization/conversation/messages',
    ]);
    expect(conversationMessageLabel(message)).toBe('你');
    expect(conversationKindLabel(message)).toBe('用户消息');
  });

  it('reads view and bounded cursor pages', async () => {
    await expect(getPrimaryConversation()).resolves.toMatchObject({ bossSessionId: 'boss_alpha' });
    await expect(getConversationMessages(message.id, 50)).resolves.toMatchObject({ hasMore: false });
    const request = String(fetchMock.mock.calls.at(-1)?.[0]);
    expect(request).toContain(`after=${message.id}`);
    expect(request).toContain('limit=50');
  });
});
