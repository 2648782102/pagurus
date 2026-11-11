// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App.js';
import { resolveWorkspace } from '../src/app/useWorkspace.js';

function connectedRuntime() {
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('workspace navigation', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.location.hash = '';
    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path.includes('health')) return Promise.resolve(json({ status: 'ok', service: 'conchbase', apiVersion: 1 }));
      if (path.includes('/v1/runtime')) return Promise.resolve(json(connectedRuntime()));
      if (path.includes('/v1/agents')) return Promise.resolve(json({ agents: [] }));
      if (path.includes('/v1/model-catalog')) return Promise.resolve(json({ models: [] }));
      if (path.includes('/v1/tasks')) return Promise.resolve(json({ tasks: [], activeConfigurationRevisionId: 'cfg_test' }));
      if (path.includes('/v1/events')) return Promise.resolve(json({ events: [] }));
      if (path.includes('/v1/configuration/revisions')) return Promise.resolve(json({ revisions: [], activeRevisionId: 'cfg_test' }));
      if (path.includes('/v1/configuration')) return Promise.resolve(json({ revision: { id: 'cfg_test', document: {} }, revisions: [] }));
      if (path.includes('/v1/work/items')) return Promise.resolve(json({ workItems: [] }));
      if (path.includes('/v1/work/delivery-receipts')) return Promise.resolve(json({ deliveryReceipts: [] }));
      if (path.includes('/v1/capabilities')) return Promise.resolve(json({ capabilities: [] }));
      if (path.includes('/v1/secret-handles')) return Promise.resolve(json({ handles: [] }));
      if (path.includes('use-receipts')) return Promise.resolve(json({ receipts: [] }));
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

  it('maps legacy anchors to their owning workspaces', () => {
    expect(resolveWorkspace('#overview').id).toBe('overview');
    expect(resolveWorkspace('#agent-title').id).toBe('agents');
    expect(resolveWorkspace('#task-history-title').id).toBe('tasks');
    expect(resolveWorkspace('#workbench').id).toBe('work');
    expect(resolveWorkspace('#capabilities').id).toBe('capabilities');
    expect(resolveWorkspace('#secrets-title').id).toBe('secrets');
    expect(resolveWorkspace('#configuration-title').id).toBe('settings');
    expect(resolveWorkspace('#unknown').id).toBe('overview');
  });

  it('shows one active, labeled workspace and only its content', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: '控制台总览' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /总览/ }).some(
      (link) => link.getAttribute('aria-current') === 'page',
    )).toBe(true);
    expect(screen.getAllByRole('link', { name: /Agent 配置/ }).some(
      (link) => link.getAttribute('href') === '#agent-panel',
    )).toBe(true);
    expect(screen.getAllByRole('link', { name: /运行时设置/ }).some(
      (link) => link.getAttribute('href') === '#configuration-title',
    )).toBe(true);
    expect(screen.getByRole('heading', { name: '海螺 Conchbase' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Agent 配置', level: 2 })).toBeNull();
    expect(screen.queryByRole('heading', { name: '运行一次任务' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '配置版本' })).toBeNull();
  });

  it('switches workspaces through a hash link without a router dependency', async () => {
    render(<App />);
    const settingsLink = (await screen.findAllByRole('link', { name: /运行时设置/ }))[0];

    fireEvent.click(settingsLink, { button: 0 });
    window.location.hash = '#configuration-title';
    fireEvent(window, new Event('hashchange'));

    expect(await screen.findByRole('heading', { name: '运行时策略' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /运行时设置/ }).some(
      (link) => link.getAttribute('aria-current') === 'page',
    )).toBe(true);
    expect(screen.getByRole('heading', { name: '配置版本' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '控制台总览' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '运行一次任务' })).toBeNull();
  });

  it('keeps a skip link and visible active navigation', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: '跳到控制台内容' }).getAttribute('href')).toBe('#workspace-content');
    expect(document.getElementById('workspace-content')?.getAttribute('tabindex')).toBe('-1');
    expect(screen.getAllByRole('navigation', { name: '工作区' }).length).toBe(1);
    expect(screen.getAllByRole('link').length).toBeGreaterThan(7);
  });

  it('gives each workspace link one exact accessible name', () => {
    render(<App />);
    const navigation = screen.getByRole('navigation', { name: '工作区' });

    for (const name of [
      '总览：连接状态与快速入口',
      'Agent 配置：身份、版本与默认模型',
      '任务运行：运行一次任务与任务历史',
      '持久工作：工作项、恢复与交付证据',
      '能力目录：MCP、Skill、插件元数据',
      '敏感信息：只写提交、轮换与收据',
      '运行时设置：版本化配置与回滚',
    ]) {
      expect(within(navigation).getByRole('link', { name })).toBeTruthy();
    }
  });

  it('keeps capability and sensitive-handle panels in separate workspaces', async () => {
    render(<App />);
    window.location.hash = '#capability-title';
    fireEvent(window, new Event('hashchange'));

    expect(await screen.findByRole('heading', { name: '能力与扩展记录' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '能力目录', level: 2 })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '敏感信息句柄' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '只写敏感信息' })).toBeNull();

    window.location.hash = '#secrets-title';
    fireEvent(window, new Event('hashchange'));

    expect(await screen.findByRole('heading', { name: '只写敏感信息' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '敏感信息句柄', level: 2 })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '能力目录', level: 2 })).toBeNull();
  });
});
