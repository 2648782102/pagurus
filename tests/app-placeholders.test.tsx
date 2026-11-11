// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/app/App.js';

describe('App workspaces', () => {
  afterEach(() => {
    cleanup();
  });

  it('links every final local-first control surface rather than planned placeholders', () => {
    render(<App />);

    for (const label of [
      '工具与连接配置入口建设中',
      'Skills 配置入口建设中',
      '设置入口建设中',
    ]) {
      expect(screen.queryByLabelText(label)).toBeNull();
    }

    expect(screen.getAllByRole('link', { name: /Agent 配置/ }).some(
      (link) => link.getAttribute('href') === '#agent-panel',
    )).toBe(true);
    expect(screen.getAllByRole('link', { name: /运行时配置/ }).some(
      (link) => link.getAttribute('href') === '#configuration-title',
    )).toBe(true);
    expect(screen.getAllByRole('link', { name: /任务运行/ }).some(
      (link) => link.getAttribute('href') === '#task-operations-title',
    )).toBe(true);
    expect(screen.getAllByRole('link', { name: /能力目录/ }).some(
      (link) => link.getAttribute('href') === '#capability-title',
    )).toBe(true);
    expect(screen.getAllByRole('link', { name: /敏感信息/ }).some(
      (link) => link.getAttribute('href') === '#secrets-title',
    )).toBe(true);
    expect(screen.getAllByRole('link', { name: /运行时设置/ }).some(
      (link) => link.getAttribute('href') === '#configuration-title',
    )).toBe(true);
    expect(screen.getByText(/v1\.0/)).toBeTruthy();
    expect(document.body.textContent).not.toContain('配置入口建设中');
  });
});
