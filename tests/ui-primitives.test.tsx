// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Button,
  Disclosure,
  EmptyState,
  Field,
  Notice,
  Section,
  Select,
  StatusDot,
  Tag,
  Textarea,
  TextInput,
} from '../src/shared/ui/primitives.js';

describe('shared UI primitives', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders buttons with variant, size, and native disabled state', () => {
    render(<>
      <Button variant="primary">保存</Button>
      <Button variant="danger" size="sm" disabled>删除</Button>
      <Button variant="ghost">取消</Button>
    </>);

    const save = screen.getByRole('button', { name: '保存' });
    expect(save.getAttribute('type')).toBe('button');
    expect(save.className).toContain('ui-button-primary');
    expect(save.className).toContain('ui-button-md');

    const remove = screen.getByRole('button', { name: '删除' });
    expect(remove.className).toContain('ui-button-danger');
    expect(remove.className).toContain('ui-button-sm');
    expect((remove as HTMLButtonElement).disabled).toBe(true);
  });

  it('associates a field label with its control and exposes the hint', () => {
    render(<Field label="Agent 名称" htmlFor="agent-name" hint="不超过 120 个字符">
      <TextInput id="agent-name" defaultValue="研究员" />
    </Field>);

    expect(screen.getByLabelText('Agent 名称')).toBeTruthy();
    expect(screen.getByText('不超过 120 个字符')).toBeTruthy();
  });

  it('keeps select and textarea semantics intact', () => {
    render(<>
      <Field label="模型" htmlFor="model">
        <Select id="model" defaultValue="b">
          <option value="a">模型 A</option>
          <option value="b">模型 B</option>
        </Select>
      </Field>
      <Field label="指令" htmlFor="instructions">
        <Textarea id="instructions" rows={3} defaultValue="保持简短。" />
      </Field>
    </>);

    expect((screen.getByLabelText('模型') as HTMLSelectElement).value).toBe('b');
    expect((screen.getByLabelText('指令') as HTMLTextAreaElement).value).toBe('保持简短。');
  });

  it('renders status without relying on color alone', () => {
    render(<>
      <StatusDot tone="success" label="已完成" />
      <Tag tone="danger">失败</Tag>
      <Tag tone="warning">等待审批</Tag>
    </>);

    expect(screen.getByRole('img', { name: '已完成' })).toBeTruthy();
    expect(screen.getByText('失败')).toBeTruthy();
    expect(screen.getByText('等待审批')).toBeTruthy();
  });

  it('exposes disclosure state and toggles on summary activation', () => {
    render(<Disclosure summary="技术细节">
      <p>Agent revision agr_alpha</p>
    </Disclosure>);

    const details = document.querySelector('details');
    const summary = screen.getByText('技术细节');
    expect(details?.open).toBe(false);
    expect(summary.tagName).toBe('SUMMARY');
    fireEvent.click(summary);
    expect(details?.open).toBe(true);
  });

  it('renders section headings and empty states as status content', () => {
    render(<>
      <Section title="需要你处理" description="当前没有待处理事项。">
        <EmptyState title="没有待办" description="新的审批或问题会出现在这里。" />
      </Section>
    </>);

    expect(screen.getByRole('heading', { name: '需要你处理' })).toBeTruthy();
    expect(screen.getByText('当前没有待处理事项。')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('没有待办');
  });

  it('renders notices with tone, optional title, and an explicit role', () => {
    render(<>
      <Notice tone="danger" title="连接失败" role="status" action={<Button size="sm">重试</Button>}>
        启动 Conchbase 后可以重新连接。
      </Notice>
      <Notice tone="info">当前没有待处理事项。</Notice>
    </>);

    const danger = screen.getByText('连接失败').closest('.ui-notice');
    expect(danger?.getAttribute('data-tone')).toBe('danger');
    expect(danger?.getAttribute('role')).toBe('status');
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy();
    expect(screen.getByText('当前没有待处理事项。').closest('.ui-notice')?.getAttribute('data-tone')).toBe('info');
  });
});
