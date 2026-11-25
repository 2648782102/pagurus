// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { runtimeNoticeBody } from '../src/agent/RuntimeNoticeBody.js';

afterEach(() => cleanup());

describe('Runtime notice body', () => {
  it('keeps short notices inline', () => {
    render(<div>{runtimeNoticeBody('员工已完成。')}</div>);
    expect(screen.getByText('员工已完成。')).toBeTruthy();
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('collapses a long report behind a readable summary', () => {
    const long = `员工 文档整理员 已完成。 ${'项目状态与结果说明。'.repeat(30)}`;
    render(<div>{runtimeNoticeBody(long)}</div>);
    const details = screen.getByRole('group');
    expect(details.className).toContain('agent-runtime-detail');
    expect((details as HTMLDetailsElement).open).toBe(false);
    expect(details.querySelector('summary')?.textContent?.length).toBeLessThan(140);
    expect(details.textContent).toContain('项目状态与结果说明。');
  });
});
