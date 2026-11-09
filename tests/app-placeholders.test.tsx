// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/app/App.js';

describe('App workspaces', () => {
  afterEach(() => {
    cleanup();
  });

  it('links the implemented Agent workspace and keeps other planned entries non-interactive', () => {
    render(<App />);

    for (const label of [
      '工具与连接配置入口建设中',
      'Skills 配置入口建设中',
      '设置入口建设中',
    ]) {
      const element = screen.getByLabelText(label);
      expect(element.tagName).toBe('SPAN');
      expect(element.classList.contains('is-planned')).toBe(true);
    }

    expect(screen.getByRole('link', { name: 'Agent 配置' }).getAttribute('href')).toBe('#agent-panel');
    expect(screen.getByRole('link', { name: /运行时配置/ }).getAttribute('href')).toBe('#configuration-title');
    expect(screen.getByRole('link', { name: /任务运行/ }).getAttribute('href')).toBe('#task-operations-title');
  });
});
