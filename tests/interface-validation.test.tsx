// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App.js';

const repositoryRoot = process.cwd();
const styles = readFileSync(path.join(repositoryRoot, 'src/styles.css'), 'utf8');

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function runtimeFixture() {
  return {
    name: 'Conchbase',
    version: '1.0.0',
    state: 'ready',
    capabilities: [
      'tasks',
      'events',
      'models',
      'agents',
      'provider-neutral-model-catalog',
      'durable-work-contract',
      'asynchronous-work-control',
      'local-source-policy',
      'capability-directory',
      'write-only-secret-handles',
    ],
  };
}

describe('executable interface validation', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.location.hash = '#overview';
    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path.includes('health')) return Promise.resolve(json({ status: 'ok', service: 'conchbase', apiVersion: 1 }));
      if (path.includes('/v1/runtime')) return Promise.resolve(json(runtimeFixture()));
      return Promise.resolve(json({}));
    });
    vi.stubGlobal('fetch', fetchMock);
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.location.hash = '';
  });

  it('supports skip-link focus and keyboard navigation across every workspace link', async () => {
    render(<App />);
    const skipLink = screen.getByRole('link', { name: '跳到控制台内容' });
    const main = document.getElementById('workspace-content');
    expect(main?.getAttribute('tabindex')).toBe('-1');

    skipLink.focus();
    fireEvent.click(skipLink);
    expect(document.activeElement).toBe(main);

    const navigation = screen.getByRole('navigation', { name: '工作区' });
    const links = within(navigation).getAllByRole('link');
    expect(links.length).toBe(7);
    for (const link of links) {
      link.focus();
      expect(document.activeElement).toBe(link);
      expect(link.getAttribute('tabindex')).not.toBe('-1');
      expect(link.getAttribute('aria-label')).toBeTruthy();
    }

    const active = links[0];
    expect(active?.getAttribute('aria-current')).toBe('page');
    expect(await screen.findByRole('heading', { name: '控制台总览' })).toBeTruthy();
  });

  it('keeps visible focus, reduced-motion, and narrow/wide responsive CSS boundaries', () => {
    expect(styles).toMatch(/a:focus-visible[^\n]*outline: 3px solid/);
    expect(styles).toMatch(/\[tabindex\]:focus-visible/);
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(styles).toMatch(/transition-duration: \.01ms/);
    expect(styles).toMatch(/@media \(max-width: 760px\)/);
    expect(styles).toMatch(/grid-template-columns: 72px minmax\(0, 1fr\)/);
    expect(styles).toMatch(/@media \(max-width: 420px\)/);
    expect(styles).toMatch(/\.workspace-page \{ padding: 0 14px 24px; \}/);
    expect(styles).toMatch(/\.shell \{ min-height: 100vh; display: grid; grid-template-columns: 264px minmax\(0, 1fr\); \}/);
    expect(path.isAbsolute(repositoryRoot)).toBe(true);
  });
});
