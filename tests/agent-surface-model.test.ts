import { describe, expect, it } from 'vitest';
import {
  conversationTitle,
  groupForRail,
  modelOption,
  railGroupOf,
  shortRelativeTime,
} from '../src/agent/agent-surface-model.js';

// Grouping uses the viewer's local calendar, so the fixtures are built from
// local dates rather than raw UTC instants. A raw UTC fixture would silently
// mean a different day in, say, UTC+8 and make the test machine-dependent.
const now = new Date(2026, 10, 16, 20, 0, 0);
const iso = (year: number, month: number, day: number, hour = 12, minute = 0, second = 0) =>
  new Date(year, month - 1, day, hour, minute, second).toISOString();

function at(iso: string) {
  return { id: iso, createdAt: iso };
}

describe('rail grouping', () => {
  it('classifies by calendar day, not elapsed hours', () => {
    // Late yesterday is many hours ago but still "yesterday", while an early
    // hour today stays "today" even though it is a long time ago.
    expect(railGroupOf(iso(2026, 11, 15, 23, 30), now)).toBe('yesterday');
    expect(railGroupOf(iso(2026, 11, 16, 1, 0), now)).toBe('today');
  });

  it('treats a future timestamp as today rather than "earlier"', () => {
    expect(railGroupOf(iso(2026, 11, 16, 23, 0), now)).toBe('today');
  });

  it('falls back to earlier for an unparsable timestamp', () => {
    expect(railGroupOf('not-a-date', now)).toBe('earlier');
  });

  it('keeps order inside a group and drops empty groups', () => {
    const groups = groupForRail([
      at(iso(2026, 11, 16, 10, 0)),
      at(iso(2026, 11, 16, 11, 0)),
      at(iso(2026, 10, 1, 10, 0)),
    ], now);
    expect(groups.map((group) => group.key)).toEqual(['today', 'earlier']);
    expect(groups[0]?.items.map((item) => item.id)).toEqual([
      iso(2026, 11, 16, 10, 0),
      iso(2026, 11, 16, 11, 0),
    ]);
  });
});

describe('relative time', () => {
  it('reports minutes, hours, days and months', () => {
    expect(shortRelativeTime(iso(2026, 11, 16, 20, 0), now)).toBe('刚刚');
    // Under a minute is "刚刚"; the boundary at exactly one minute rounds up.
    expect(shortRelativeTime(iso(2026, 11, 16, 19, 59, 30), now)).toBe('刚刚');
    expect(shortRelativeTime(iso(2026, 11, 16, 19, 59, 0), now)).toBe('1 分钟前');
    expect(shortRelativeTime(iso(2026, 11, 16, 19, 30), now)).toBe('30 分钟前');
    expect(shortRelativeTime(iso(2026, 11, 16, 17, 0), now)).toBe('3 小时前');
    expect(shortRelativeTime(iso(2026, 11, 13, 20, 0), now)).toBe('3 天前');
    expect(shortRelativeTime(iso(2026, 8, 1, 20, 0), now)).toBe('3 个月前');
  });

  it('returns an empty string for an unparsable timestamp', () => {
    expect(shortRelativeTime('nope', now)).toBe('');
  });
});

describe('labels', () => {
  it('prefers the published preview as a title', () => {
    expect(conversationTitle('  帮我看一下发布状态 ', 4)).toBe('帮我看一下发布状态');
  });

  it('distinguishes an empty thread from an untitled one', () => {
    expect(conversationTitle('', 0)).toBe('（空会话）');
    expect(conversationTitle('   ', 3)).toBe('（无标题对话）');
  });

  it('keeps the provider visible but secondary in a model option', () => {
    expect(modelOption({
      providerId: 'magpie', modelId: 'fixture/m', reference: 'magpie:fixture/m',
      displayName: 'Fixture',
    })).toEqual({ value: 'magpie:fixture/m', label: 'Fixture', provider: 'magpie' });
  });
});
