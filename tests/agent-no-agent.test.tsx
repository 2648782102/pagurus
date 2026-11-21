// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('Agent surface with no usable Agent', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/health') return Promise.resolve(json({ status: 'ok', service: 'conchbase', apiVersion: 1 }));
      if (path === '/v1/runtime') return Promise.resolve(json(runtime));
      // A Runtime whose Boss Agent is not configured returns an empty list.
      if (path === '/v1/agent-chat/agents') {
        return Promise.resolve(json({ version: '1.9.0', agents: [] }));
      }
      if (path === '/v1/model-catalog') {
        return Promise.resolve(json({ models: [] }));
      }
      if (path.startsWith('/v1/agent-chat/conversations?limit=')) {
        return Promise.resolve(json({ version: '1.9.0', conversations: [], defaultModelId: null }));
      }
      return Promise.resolve(json({}));
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('points at the provider/runtime state instead of telling the user to create an Agent', async () => {
    render(<AgentApp />);

    expect(await screen.findByText('还没有可对话的 Agent')).toBeTruthy();
    expect(screen.getByText(/provider 或模型目录还没配置好/)).toBeTruthy();
    // The old copy sent people to a console screen that cannot fix this.
    expect(screen.queryByText(/在控制台的「Agent 配置」里创建/)).toBeNull();
  });
});

describe('Agent surface while resuming a conversation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/health') return Promise.resolve(json({ status: 'ok', service: 'conchbase', apiVersion: 1 }));
      if (path === '/v1/runtime') return Promise.resolve(json(runtime));
      if (path === '/v1/agent-chat/agents') {
        return Promise.resolve(json({
          version: '1.9.0',
          agents: [{
            id: 'boss-agent', name: '老板 Agent', currentRevisionId: 'boss-runtime-v1',
            providerId: 'runtime', modelId: '组织编排', isDefault: false, archived: false,
          }],
        }));
      }
      if (path === '/v1/model-catalog') {
        return Promise.resolve(json({ models: [{
          providerId: 'magpie', modelId: 'fixture/chat-model',
          reference: 'magpie:fixture/chat-model', displayName: 'Fixture', capabilities: ['chat'],
        }] }));
      }
      if (path.startsWith('/v1/agent-chat/conversations?limit=')) {
        return Promise.resolve(json({
          version: '1.9.0', defaultModelId: null,
          conversations: [{
            id: `chat_${'a'.repeat(24)}`, agentId: 'boss-agent', reasoningEffort: 'medium',
            createdAt: '2026-11-19T00:00:00.000Z', messageCount: 2, lastMessagePreview: '上次的对话',
          }],
        }));
      }
      // Hold the resume request open: the list is already known, the thread is not.
      if (path === `/v1/agent-chat/conversations/chat_${'a'.repeat(24)}`) {
        return new Promise<Response>(() => undefined);
      }
      return Promise.resolve(json({}));
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('does not claim the Runtime returned no Agent while the thread loads', async () => {
    render(<AgentApp />);

    expect(await screen.findByText('和 老板 Agent 说点什么')).toBeTruthy();
    expect(screen.queryByText('还没有可对话的 Agent')).toBeNull();
    expect((screen.getByLabelText('输入消息') as HTMLTextAreaElement).disabled).toBe(false);
  });
});
