import { describe, expect, it } from 'vitest';
import {
  capabilityOptions,
  readCapabilityAudit,
  type CapabilityAudit,
} from '../src/features/agents/agent-capability-catalog.js';

const audit: CapabilityAudit = {
  version: 1,
  agents: [{
    agentId: 'agt_alpha',
    currentRevisionId: 'agr_alpha',
    archived: false,
    grants: [
      { kind: 'tool', name: 'workspace_read', stillAvailable: true },
      { kind: 'tool', name: 'removed_tool', stillAvailable: false },
      { kind: 'skill', name: 'release-notes', stillAvailable: true },
    ],
  }],
  staleGrants: [{ agentId: 'agt_alpha', revisionId: 'agr_alpha', kind: 'tool', name: 'removed_tool' }],
  available: { tools: ['workspace_read'], skills: ['release-notes'] },
};

describe('agent capability catalog', () => {
  it('reads the audit for one Agent and keeps stale grants visible', () => {
    const entry = readCapabilityAudit(audit, 'agt_alpha');
    expect(entry?.grants.map((grant) => grant.name)).toEqual(['workspace_read', 'removed_tool', 'release-notes']);
    expect(entry?.grants.find((grant) => grant.name === 'removed_tool')?.stillAvailable).toBe(false);
  });

  it('merges registered names with grants so a removed tool can be unchecked', () => {
    const options = capabilityOptions(
      ['workspace_read', 'web_extract'],
      ['release-notes'],
      [{ kind: 'tool', name: 'workspace_read', stillAvailable: true },
       { kind: 'tool', name: 'removed_tool', stillAvailable: false }],
    );
    expect(options.tools.map((entry) => entry.name)).toEqual(['workspace_read', 'web_extract', 'removed_tool']);
    expect(options.tools.find((entry) => entry.name === 'removed_tool')?.available).toBe(false);
    expect(options.skills.map((entry) => entry.name)).toEqual(['release-notes']);
  });
});

describe('older Runtime audit', () => {
  it('does not crash when the audit has no available lists', () => {
    const options = capabilityOptions([], [], [
      { kind: 'tool', name: 'workspace_read', stillAvailable: true },
    ]);
    expect(options.tools.map((item) => item.name)).toEqual(['workspace_read']);
  });
});
