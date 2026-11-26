import { describe, expect, it } from 'vitest';
import {
  agentSurfaceHref,
  consoleSurfaceHref,
  resolveSurface,
  resolveSurfaceFromLocation,
} from '../src/shared/ui/surface.js';

describe('surface resolution', () => {
  it('defaults to the Agent surface', () => {
    expect(resolveSurface('')).toBe('agent');
    expect(resolveSurface('?foo=bar')).toBe('agent');
    expect(resolveSurface('?surface=Agent')).toBe('agent');
  });

  it('keeps old console links on the one product surface', () => {
    expect(resolveSurface('?surface=console')).toBe('agent');
    expect(consoleSurfaceHref()).toBe('?surface=console');
  });

  it('still honours the explicit Agent value', () => {
    expect(resolveSurface('?surface=agent')).toBe('agent');
    expect(resolveSurface('?a=1&surface=agent')).toBe('agent');
  });

  it('offers a link that the console and product agree on', () => {
    expect(agentSurfaceHref()).toBe('?surface=agent');
    expect(resolveSurface(agentSurfaceHref())).toBe('agent');
  });

  it('keeps old console bookmarks on the product surface', () => {
    expect(resolveSurfaceFromLocation('', '#overview')).toBe('agent');
    expect(resolveSurfaceFromLocation('', '#workbench-title')).toBe('agent');
    expect(resolveSurfaceFromLocation('', '')).toBe('agent');
    expect(resolveSurfaceFromLocation('?surface=agent', '#overview')).toBe('agent');
    expect(resolveSurfaceFromLocation('?surface=console', '')).toBe('agent');
  });
});
