// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrimaryConversationPanel } from '../src/features/organization/PrimaryConversationPanel.js';
import type { RuntimeInfo } from '../src/shared/api/runtime.js';

const runtime: RuntimeInfo = {
  name: 'Conchbase',
  version: '1.0.0',
  state: 'ready',
  capabilities: [],
  organizationContract: '1.1.0',
  organizationPaths: 18,
  conversationContract: '1.4.0',
  conversationPaths: 2,
};

const message = {
  version: '1.4.0' as const,
  id: `msg_${'a'.repeat(24)}`,
  sequence: 1,
  kind: 'user_message' as const,
  author: 'user' as const,
  body: 'Start project atlas and hire worker planner.',
  state: 'published' as const,
  createdByEventId: 'evt_alpha',
  projectId: 'project_atlas',
  workerId: null,
  reportId: null,
  attentionId: `att_${'b'.repeat(21)}`,
  expectedVersion: 7,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('primary conversation panel', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/organization/conversation') {
        return Promise.resolve(json({
          version: '1.4.0',
          bossSessionId: 'boss_alpha',
          messageCount: 2,
          nextCursor: `msg_${'c'.repeat(24)}`,
          hasMore: false,
          messages: [message, {
            ...message,
            id: `msg_${'c'.repeat(24)}`,
            sequence: 2,
            kind: 'attention',
            author: 'boss',
            body: '老板 Agent 需要你确认一个开放问题。',
            state: 'open',
          }],
        }));
      }
      if (path.startsWith('/v1/organization/conversation/messages')) {
        return Promise.resolve(json({
          version: '1.4.0',
          messages: [],
          nextCursor: `msg_${'c'.repeat(24)}`,
          hasMore: false,
        }));
      }
      return Promise.resolve(json({ error: 'not found' }, 404));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders published Runtime messages and a complete composer', async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(
      <PrimaryConversationPanel
        runtime={runtime}
        intentText="Start project atlas and hire worker planner."
        busy={false}
        onIntentTextChange={vi.fn()}
        onSubmitIntent={submit}
        onDecideAttention={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(await screen.findByText('Start project atlas and hire worker planner.')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('老板 Agent 需要你确认一个开放问题。')).toBeTruthy());
    expect(screen.getByRole('button', { name: '回答' })).toBeTruthy();
    expect(screen.getByLabelText('给老板 Agent 发消息')).toBeTruthy();
    fireEvent.submit(screen.getByRole('button', { name: '发送' }).closest('form')!);
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  });

  it('keeps the old organization console readable when 1.4.0 is absent', async () => {
    render(
      <PrimaryConversationPanel
        runtime={{ ...runtime, conversationContract: undefined, conversationPaths: undefined }}
        intentText=""
        busy={false}
        onIntentTextChange={vi.fn()}
        onSubmitIntent={vi.fn()}
        onDecideAttention={vi.fn()}
      />,
    );
    expect(await screen.findByText(/conversationContract: 1\.4\.0/)).toBeTruthy();
  });
});
