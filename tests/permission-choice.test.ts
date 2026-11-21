import { describe, expect, it } from 'vitest';
import {
  defaultPermissionLevel,
  hasPermissionChoice,
  permissionOptionsFor,
} from '../src/features/agent-chat/permission-choice.js';

/**
 * A permission dropdown is a switch for turning approval off unless it can only
 * tighten. The Runtime clamps a looser request silently, so the client must not
 * offer one — a reader who picks "完全放开" and sees nothing change cannot tell
 * whether approval is still on.
 */
describe('permission choice', () => {
  it('offers only the runtime level and anything stricter', () => {
    const values = permissionOptionsFor('standard').map((option) => option.value);
    expect(values).toEqual(['strict', 'standard']);
    expect(values).not.toContain('trusted');
  });

  it('offers a single option on a strict runtime', () => {
    const options = permissionOptionsFor('strict');
    expect(options.map((option) => option.value)).toEqual(['strict']);
    // One option is not a choice; the caller hides the control.
    expect(hasPermissionChoice(options)).toBe(false);
  });

  it('offers every level on a trusted runtime', () => {
    const options = permissionOptionsFor('trusted');
    expect(options.map((option) => option.value)).toEqual(['strict', 'standard', 'trusted']);
    expect(hasPermissionChoice(options)).toBe(true);
  });

  it('assumes standard when the runtime publishes no level', () => {
    // An older Runtime behaved as `standard`; offering `trusted` would be a
    // choice that Runtime cannot honour.
    expect(permissionOptionsFor(null).map((option) => option.value)).toEqual(['strict', 'standard']);
    expect(defaultPermissionLevel(null)).toBe('standard');
  });

  it('defaults to the runtime level so the first choice is never clamped', () => {
    expect(defaultPermissionLevel('strict')).toBe('strict');
    expect(defaultPermissionLevel('trusted')).toBe('trusted');
  });

  it('orders options most restrictive first', () => {
    expect(permissionOptionsFor('trusted').map((option) => option.value))
      .toEqual(['strict', 'standard', 'trusted']);
  });
});
