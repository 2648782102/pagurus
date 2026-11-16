import { describe, expect, it } from 'vitest';
import {
  grantsToDraft,
  parseGrantDraft,
  selectedModelReference,
} from '../src/features/agents/agent-draft.js';

const models = [
  { providerId: 'magpie', modelId: 'a', reference: 'magpie:a', displayName: 'A', capabilities: [] },
  { providerId: 'other', modelId: 'b', reference: 'other:b', displayName: 'B', capabilities: [] },
];

describe('agent grant draft', () => {
  it('parses comma- and whitespace-separated grants in order', () => {
    expect(parseGrantDraft('read_file, write_file\nsearch', 'notes')).toEqual([
      { kind: 'tool', name: 'read_file' },
      { kind: 'tool', name: 'write_file' },
      { kind: 'tool', name: 'search' },
      { kind: 'skill', name: 'notes' },
    ]);
  });

  it('ignores blank separators', () => {
    expect(parseGrantDraft(' ,  , ', '')).toEqual([]);
  });

  it('rejects a name the Runtime would refuse', () => {
    expect(() => parseGrantDraft('Read File', '')).toThrow('不符合 Runtime 命名规则');
  });

  it('rejects a duplicate within one kind', () => {
    expect(() => parseGrantDraft('read_file read_file', '')).toThrow('重复出现');
  });

  it('allows the same name across different kinds', () => {
    expect(parseGrantDraft('notes', 'notes')).toEqual([
      { kind: 'tool', name: 'notes' },
      { kind: 'skill', name: 'notes' },
    ]);
  });

  it('enforces the grant ceiling across both kinds', () => {
    const tools = Array.from({ length: 64 }, (_, index) => `tool_${index}`).join(' ');
    expect(() => parseGrantDraft(tools, 'one_more')).toThrow('最多可授权 64 项');
  });

  it('round-trips grants back into editor text', () => {
    const draft = grantsToDraft([
      { kind: 'tool', name: 'read_file' },
      { kind: 'skill', name: 'notes' },
      { kind: 'tool', name: 'search' },
    ]);
    expect(draft).toEqual({ toolNames: 'read_file\nsearch', skillNames: 'notes' });
    expect(grantsToDraft(undefined)).toEqual({ toolNames: '', skillNames: '' });
  });
});

describe('agent model reference', () => {
  it('matches a revision by provider and model, not by reference text', () => {
    expect(selectedModelReference(models, {
      name: 'A', instructions: '', providerId: 'other', modelId: 'b',
    } as never)).toBe('other:b');
  });

  it('leaves the reference empty when the catalog no longer offers the model', () => {
    expect(selectedModelReference(models, {
      name: 'A', instructions: '', providerId: 'magpie', modelId: 'retired',
    } as never)).toBe('');
  });

  it('falls back to the first catalog entry only when there is no revision', () => {
    expect(selectedModelReference(models, undefined)).toBe('magpie:a');
    expect(selectedModelReference([], undefined)).toBe('');
  });
});
