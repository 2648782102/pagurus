import { describe, expect, it } from 'vitest';
import { agentSurfaceHref, resolveSurface } from '../src/app/surface.js';

describe('surface resolution', () => {
  it('defaults to the operator console', () => {
    expect(resolveSurface('')).toBe('console');
    expect(resolveSurface('?foo=bar')).toBe('console');
    expect(resolveSurface('?surface=console')).toBe('console');
  });

  it('selects the product surface only for the explicit value', () => {
    expect(resolveSurface('?surface=agent')).toBe('agent');
    expect(resolveSurface('?a=1&surface=agent')).toBe('agent');
    expect(resolveSurface('?surface=Agent')).toBe('console');
    expect(resolveSurface('?surface=')).toBe('console');
  });

  it('offers a link that the console and product agree on', () => {
    expect(agentSurfaceHref()).toBe('?surface=agent');
    expect(resolveSurface(agentSurfaceHref())).toBe('agent');
  });
});
