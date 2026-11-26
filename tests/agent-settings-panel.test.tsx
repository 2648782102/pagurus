// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentSettingsPanel } from '../src/features/agents/AgentSettingsPanel.js';

const runtime = { name: 'Conchbase', version: '1.0.0', state: 'ready',
  capabilities: ['agents', 'provider-neutral-model-catalog'] } as never;

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('Agent settings panel', () => {
  it('renders tools as a product-native checklist', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/v1/runtime') return Promise.resolve(json(runtime));
      if (path === '/v1/agents/default') return Promise.resolve(json({ agent: null }));
      if (path === '/v1/agents') return Promise.resolve(json({ agents: [{
        id: 'agt_a', currentRevisionId: 'agr_a', archived: false, isDefault: false,
        current: { id: 'agr_a', name: '研究员', instructions: '', providerId: 'magpie', modelId: 'm',
          grantedCapabilities: [{ kind: 'tool', name: 'workspace_read' }], createdAt: '2026-01-01T00:00:00.000Z' },
      }] }));
      if (path === '/v1/agents/agt_a') return Promise.resolve(json({ agent: {
        id: 'agt_a', currentRevisionId: 'agr_a', archived: false, isDefault: false,
        current: { id: 'agr_a', name: '研究员', instructions: '', providerId: 'magpie', modelId: 'm',
          grantedCapabilities: [{ kind: 'tool', name: 'workspace_read' }], createdAt: '2026-01-01T00:00:00.000Z' },
        revisions: [],
      } }));
      if (path === '/v1/model-catalog') return Promise.resolve(json({ models: [{ providerId: 'magpie', modelId: 'm',
        reference: 'magpie:m', displayName: '模型', capabilities: ['chat'] }] }));
      if (path === '/v1/agents/capability-grants') return Promise.resolve(json({ version: 1,
        agents: [], staleGrants: [], available: { tools: ['workspace_read', 'web_extract'], skills: [] } }));
      return Promise.resolve(json({}));
    }));
    render(<AgentSettingsPanel runtime={runtime} onAgentsChanged={() => undefined} />);
    expect(await screen.findByRole('heading', { name: 'Agent 与工具' })).toBeTruthy();
    expect(await screen.findByRole('checkbox', { name: 'web_extract' })).toBeTruthy();
  });
});
