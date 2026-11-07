// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/app/App.js';

describe('App workspaces', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not present unimplemented workspaces as clickable navigation', () => {
    render(<App />);

    for (const label of [
      'Agents 配置入口建设中',
      '工具与连接配置入口建设中',
      'Skills 配置入口建设中',
      '设置入口建设中',
    ]) {
      const element = screen.getByLabelText(label);
      expect(element.tagName).toBe('SPAN');
      expect(element.classList.contains('is-planned')).toBe(true);
    }

    expect(screen.queryByRole('link', { name: 'Agents' })).toBeNull();
    expect(screen.getByRole('link', { name: /任务运行/ }).getAttribute('href')).toBe('#task-operations-title');
  });
});
