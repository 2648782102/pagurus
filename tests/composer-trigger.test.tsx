// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyTriggerChoice,
  composerTriggerAt,
  fileMention,
  filterCommands,
  type ComposerCommand,
} from '../src/features/agent-chat/composer-trigger.js';
import { AgentChatComposer } from '../src/features/agent-chat/AgentChatComposer.js';

afterEach(cleanup);

const both = { commands: true, files: true };

const commands: readonly ComposerCommand[] = [
  { id: 'new', title: '新对话', hint: '开始一个干净的对话。' },
  { id: 'context', title: '对话上下文', hint: '查看会话的 Agent 与模型。', keywords: ['info'] },
];

describe('composer trigger parsing', () => {
  it('opens on a slash at the start of a word and reads the query', () => {
    expect(composerTriggerAt('/', 1, both)).toEqual({ kind: 'command', query: '', start: 0 });
    expect(composerTriggerAt('帮我看 /con', 9, both)).toEqual({ kind: 'command', query: 'con', start: 4 });
  });

  it('does not open inside a word or after a space ends the token', () => {
    expect(composerTriggerAt('/cmd done', 9, both)).toBeNull();
    expect(composerTriggerAt('1/2', 3, both)).toBeNull();
  });

  /*
   * These are DSH's own carve-outs, and they are the reason its detector is
   * vendored rather than reimplemented: a URL's slashes and an address's `@`
   * are the two ways a naive scanner opens a menu nobody asked for.
   */
  it('stays closed inside a URL and an email address', () => {
    expect(composerTriggerAt('看 https://example.com/a', 23, both)).toBeNull();
    expect(composerTriggerAt('发到 me@example.com', 17, both)).toBeNull();
  });

  it('treats an @ token as a file reference, slashes included', () => {
    expect(composerTriggerAt('@', 1, both)).toEqual({ kind: 'file', query: '', quoted: false, start: 0 });
    expect(composerTriggerAt('看 @docs/plan', 12, both)).toEqual(
      { kind: 'file', query: 'docs/plan', quoted: false, start: 2 },
    );
  });

  it('keeps an open quoted path as one token, spaces included', () => {
    const draft = '看 @"docs/my plan';
    // A real caret never passes the end of the draft; the detector clamps the
    // slice, so a beyond-end caret would report a token start that cannot occur.
    expect(composerTriggerAt(draft, draft.length, both)).toEqual(
      { kind: 'file', query: 'docs/my plan', quoted: true, start: 2 },
    );
  });

  it('offers nothing the surface did not advertise', () => {
    expect(composerTriggerAt('/', 1, { commands: false, files: true })).toBeNull();
    expect(composerTriggerAt('@', 1, { commands: true, files: false })).toBeNull();
  });

  it('filters commands by id, title and keyword', () => {
    expect(filterCommands(commands, 'con').map((command) => command.id)).toEqual(['context']);
    expect(filterCommands(commands, 'info').map((command) => command.id)).toEqual(['context']);
    expect(filterCommands(commands, '')).toHaveLength(2);
  });

  it('replaces the whole trigger token and reports where the caret belongs', () => {
    const trigger = composerTriggerAt('看 @doc', 6, both)!;
    expect(applyTriggerChoice('看 @doc', trigger, '@docs/plan.md ')).toEqual({
      draft: '看 @docs/plan.md ',
      caret: 16,
    });
  });

  it('quotes a path with a space, through DSH\'s mention grammar', () => {
    expect(fileMention('docs/my plan.md')).toBe('@"docs/my plan.md"');
    expect(fileMention('docs/plan.md')).toBe('@docs/plan.md');
  });
});

describe('composer trigger menu', () => {
  it('opens on / and runs the chosen command without sending the message', () => {
    const onSend = vi.fn();
    const onCommand = vi.fn();
    const onDraftChange = vi.fn();
    render(
      <AgentChatComposer
        draft="/"
        busy={false}
        waiting={false}
        onDraftChange={onDraftChange}
        onSend={onSend}
        commands={commands}
        onCommand={onCommand}
      />,
    );
    const input = screen.getByLabelText('输入消息') as HTMLTextAreaElement;
    input.setSelectionRange(1, 1);
    fireEvent.select(input);
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommand).toHaveBeenCalledWith('new');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('moves the active row with the arrow keys and chooses with Tab', () => {
    const onCommand = vi.fn();
    render(
      <AgentChatComposer
        draft="/"
        busy={false}
        waiting={false}
        onDraftChange={vi.fn()}
        onSend={vi.fn()}
        commands={commands}
        onCommand={onCommand}
      />,
    );
    const input = screen.getByLabelText('输入消息');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(onCommand).toHaveBeenCalledWith('context');
  });

  it('closes on Escape and leaves the draft alone', () => {
    render(
      <AgentChatComposer
        draft="/"
        busy={false}
        waiting={false}
        onDraftChange={vi.fn()}
        onSend={vi.fn()}
        commands={commands}
        onCommand={vi.fn()}
      />,
    );
    const input = screen.getByLabelText('输入消息');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('does not offer a command menu when the surface passes no commands', () => {
    render(
      <AgentChatComposer
        draft="/"
        busy={false}
        waiting={false}
        onDraftChange={vi.fn()}
        onSend={vi.fn()}
      />,
    );
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
