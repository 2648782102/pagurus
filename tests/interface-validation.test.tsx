// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App.js';

const repositoryRoot = process.cwd();
const styleLayers = [
  'base.css',
  'shell.css',
  'page.css',
  'overview.css',
  'tasks.css',
  'workbench.css',
  'organization.css',
  'execution.css',
  'conversation.css',
  'configuration.css',
  'footer.css',
  'agent-tokens.css',
  'agent-shell.css',
  'agent-entry.css',
  'agent-chat.css',
  'responsive.css',
  'agent-responsive.css',
];
const styleEntry = readFileSync(path.join(repositoryRoot, 'src/styles.css'), 'utf8');
/**
 * ADR 0038 keeps one entry point but splits the cascade by layer. Tests assert
 * against the composed sheet so a selector's file location stays free to move.
 */
const styles = styleLayers
  .map((file) => readFileSync(path.join(repositoryRoot, 'src/styles', file), 'utf8'))
  .join('\n');
const tokens = readFileSync(path.join(repositoryRoot, 'src/styles/tokens.css'), 'utf8');

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
    expect(links.length).toBe(10);
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
    expect(styles).toMatch(/a:focus-visible[\s\S]{0,200}outline: \d+px solid/);
    expect(styles).toMatch(/\[tabindex\]:focus-visible/);
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(styles).toMatch(/transition-duration: \.01ms/);
    expect(styles).toMatch(/--rail-width: \d+px/);
    expect(styles).toMatch(/grid-template-columns: var\(--rail-width\) minmax\(0, 1fr\)/);
    expect(styles).toMatch(/@media \(max-width: 760px\)/);
    expect(styles).toMatch(/@media \(max-width: 520px\)/);
    expect(styles).toMatch(/\.workspace-page \{\s*padding: 0 13px 24px;/);
    expect(styles).toMatch(/\.console-main \{ min-width: 0; outline: none; background: var\(--canvas\); \}/);
    expect(styles).toMatch(/\.organization-panel/);
    expect(styles).toMatch(/\.secret-create-form \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
    expect(styles).not.toMatch(/\.page-description \{ display: none; \}/);
    expect(styles).toMatch(/\.agent-chat-shell \{ display: flex; flex-direction: column;/);
    expect(styles).toMatch(/\.agent-chat-conversation \{ display: grid; flex: 1 1 auto;/);
    expect(path.isAbsolute(repositoryRoot)).toBe(true);
  });

  it('keeps the operations-desk theme distinct from the generic warm-card default', () => {
    for (const file of styleLayers) {
      expect(styleEntry, `styles.css must import ${file}`).toContain(`"./styles/${file}"`);
    }
    expect(tokens).toMatch(/--canvas: #e9edee;/);
    expect(tokens).toMatch(/--navy: #17272c;/);
    expect(tokens).toMatch(/--rust: #9f4522;/);
    expect(tokens).toMatch(/--radius-lg: 0;/);
    expect(tokens).toMatch(/--shadow-card: none;/);
    expect(tokens).not.toMatch(/#f3f1e9|#fcfbf7/);
    expect(styles).toMatch(/\.sidebar \{[^}]*background: var\(--navy\);/);
    expect(styles).toMatch(/\.task-panel,\s*\.history-panel/);
  });

  it('styles the Agent Chat activity and approval surfaces it renders', () => {
    const thread = readFileSync(
      path.join(repositoryRoot, 'src/features/agent-chat/AgentChatThread.tsx'),
      'utf8',
    );
    expect(thread).toContain('agent-chat-activity');
    expect(thread).toContain('agent-chat-approval-actions');
    expect(styles).toMatch(/\.agent-chat-activity \{/);
    expect(styles).toMatch(/\.agent-chat-approval-actions \{/);
  });
});
