// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentSettingsDrawer } from '../src/agent/AgentSettingsDrawer.js';

const runtime = {
  name: 'Conchbase', version: '1.0.0', state: 'ready',
  capabilities: ['agents', 'provider-neutral-model-catalog', 'capability-directory'],
} as never;

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('Agent settings drawer', () => {
  it('offers one settings entry with Agent and tool configuration', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/agents/default') return Promise.resolve(json({ agent: null }));
      if (path === '/v1/agents') return Promise.resolve(json({ agents: [] }));
      if (path === '/v1/agents/capability-grants') {
        return Promise.resolve(json({ version: 1, agents: [], staleGrants: [], available: { tools: [], skills: [] } }));
      }
      if (path === '/v1/model-catalog') return Promise.resolve(json({ models: [] }));
      if (path === '/v1/runtime') return Promise.resolve(json(runtime));
      return Promise.resolve(json({}));
    }));
    render(<AgentSettingsDrawer open runtime={runtime} onClose={() => undefined} onAgentsChanged={() => undefined} theme="light" onToggleTheme={() => undefined} onOpenContext={() => undefined} onOpenDiagnostics={() => undefined} />);
    expect(await screen.findByRole('dialog', { name: '设置' })).toBeTruthy();
    expect(await screen.findByRole('navigation', { name: '设置分区' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agent 与工具' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: '控制台' })).toBeNull();
  });

  it('renders the tool configuration section without a console link', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/agents/default') return Promise.resolve(json({ agent: {
        id: 'agt_alpha', currentRevisionId: 'agr_alpha', archived: false, isDefault: true,
        current: { id: 'agr_alpha', name: '研究员', instructions: '', providerId: 'magpie', modelId: 'fixture/model', grantedCapabilities: [], createdAt: '2026-01-01T00:00:00.000Z' },
      } }));
      if (path === '/v1/agents') return Promise.resolve(json({ agents: [{
        id: 'agt_alpha', currentRevisionId: 'agr_alpha', archived: false, isDefault: true,
        current: { id: 'agr_alpha', name: '研究员', instructions: '', providerId: 'magpie',
          modelId: 'fixture/model', grantedCapabilities: [{ kind: 'tool', name: 'workspace_read' }], createdAt: '2026-01-01T00:00:00.000Z' },
      }] }));
      if (path === '/v1/agents/agt_alpha') return Promise.resolve(json({ agent: {
        id: 'agt_alpha', currentRevisionId: 'agr_alpha', archived: false, isDefault: true,
        current: { id: 'agr_alpha', name: '研究员', instructions: '', providerId: 'magpie',
          modelId: 'fixture/model', grantedCapabilities: [{ kind: 'tool', name: 'workspace_read' }], createdAt: '2026-01-01T00:00:00.000Z' },
        revisions: [],
      } }));
      if (path === '/v1/agents/capability-grants') return Promise.resolve(json({
        version: 1,
        agents: [{ agentId: 'agt_alpha', currentRevisionId: 'agr_alpha', archived: false,
          grants: [{ kind: 'tool', name: 'workspace_read', stillAvailable: true }] }],
        staleGrants: [], available: { tools: ['workspace_read'], skills: [] },
      }));
      if (path === '/v1/model-catalog') return Promise.resolve(json({ models: [{
        providerId: 'magpie', modelId: 'fixture/model', reference: 'magpie:fixture/model',
        displayName: 'Fixture', capabilities: ['chat'],
      }] }));
      if (path === '/v1/runtime') return Promise.resolve(json(runtime));
      return Promise.resolve(json({}));
    }));
    render(<AgentSettingsDrawer open runtime={runtime} onClose={() => undefined} onAgentsChanged={() => undefined} theme="light" onToggleTheme={() => undefined} onOpenContext={() => undefined} onOpenDiagnostics={() => undefined} />);
    expect(await screen.findByRole('heading', { name: '设置' })).toBeTruthy();
    expect(await screen.findByText(/^工具$/)).toBeTruthy();
  });
});
