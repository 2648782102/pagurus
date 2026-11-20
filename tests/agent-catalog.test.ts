import { describe, expect, it } from 'vitest';
import { preferredAgentId, selectableAgents, type AgentCatalog } from '../src/shared/api/agent-catalog.js';
import type { Agent, ProviderModel } from '../src/shared/api/agents.js';

function agent(id: string, archived = false): Agent {
  return {
    id,
    archived,
    current: {
      name: id,
      instructions: '',
      providerId: 'magpie',
      modelId: 'fixture/model',
    },
  } as unknown as Agent;
}

function catalog(agents: readonly Agent[], defaultAgentId: string | null): AgentCatalog {
  return {
    supportsAgents: true,
    agents,
    models: [] as readonly ProviderModel[],
    defaultAgentId,
  };
}

describe('which agents can take work', () => {
  it('drops archived agents', () => {
    expect(selectableAgents(catalog([agent('a'), agent('b', true)], null)).map((entry) => entry.id))
      .toEqual(['a']);
  });
});

describe('where a panel lands', () => {
  it('keeps the agent the reader had open', () => {
    expect(preferredAgentId(catalog([agent('a'), agent('b')], 'a'), 'b')).toBe('b');
  });

  it('falls back to the Runtime default when the remembered agent is gone', () => {
    expect(preferredAgentId(catalog([agent('a'), agent('b')], 'a'), 'deleted')).toBe('a');
  });

  it('does not land on an archived default', () => {
    /*
     * The two panels disagreed here: one kept the default even after it was
     * archived, which opened the editor on an Agent the reader could no longer
     * start. Archived means "not selectable", so it cannot be the landing.
     */
    expect(preferredAgentId(catalog([agent('a'), agent('b', true)], 'b'), '')).toBe('a');
  });

  it('does not keep an archived agent even when it was the last one open', () => {
    expect(preferredAgentId(catalog([agent('a'), agent('b', true)], null), 'b')).toBe('a');
  });

  it('returns empty when nothing is selectable', () => {
    expect(preferredAgentId(catalog([agent('a', true)], 'a'), 'a')).toBe('');
    expect(preferredAgentId(catalog([], null), '')).toBe('');
  });
});
