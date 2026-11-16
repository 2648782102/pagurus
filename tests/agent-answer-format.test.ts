import { describe, expect, it } from 'vitest';
import { hasBlockStructure, parseAnswer } from '../src/agent/agent-answer-format.js';

describe('answer parsing', () => {
  it('keeps a single paragraph as one paragraph', () => {
    const blocks = parseAnswer('发布已通过。');
    expect(blocks).toEqual([{ kind: 'paragraph', text: '发布已通过。' }]);
    expect(hasBlockStructure(blocks)).toBe(false);
  });

  it('joins wrapped prose into one paragraph and splits on a blank line', () => {
    const blocks = parseAnswer('第一行\n第二行\n\n新的段落');
    expect(blocks).toEqual([
      { kind: 'paragraph', text: '第一行\n第二行' },
      { kind: 'paragraph', text: '新的段落' },
    ]);
  });

  it('reads a fenced block without touching its interior', () => {
    const body = ['说明：', '```ts', 'const a = 1;', '', '  indented();', '```'].join('\n');
    const blocks = parseAnswer(body);
    expect(blocks[1]).toEqual({
      kind: 'code',
      language: 'ts',
      text: 'const a = 1;\n\n  indented();',
    });
    expect(hasBlockStructure(blocks)).toBe(true);
  });

  it('renders an unterminated fence instead of dropping it', () => {
    const blocks = parseAnswer('先看：\n```\npartial');
    expect(blocks[1]).toEqual({ kind: 'code', language: null, text: 'partial' });
  });

  it('collects bullet items into one list', () => {
    const blocks = parseAnswer('- 一\n- 二\n- 三');
    expect(blocks).toEqual([{ kind: 'list', ordered: false, items: ['一', '二', '三'] }]);
  });

  it('collects numbered steps and tolerates ") "', () => {
    const blocks = parseAnswer('1. 甲\n2) 乙');
    expect(blocks).toEqual([{ kind: 'list', ordered: true, items: ['甲', '乙'] }]);
  });

  it('does not merge a bullet list into a numbered list', () => {
    const blocks = parseAnswer('1. 甲\n- 乙');
    expect(blocks[0]).toEqual({ kind: 'list', ordered: true, items: ['甲'] });
    expect(blocks[1]).toEqual({ kind: 'list', ordered: false, items: ['乙'] });
  });

  it('reads headings and quotes', () => {
    const blocks = parseAnswer('## 结论\n> 一句话总结');
    expect(blocks).toEqual([
      { kind: 'heading', text: '结论' },
      { kind: 'quote', text: '一句话总结' },
    ]);
  });

  it('treats a hash without a space as ordinary text', () => {
    expect(parseAnswer('#1 问题')).toEqual([{ kind: 'paragraph', text: '#1 问题' }]);
  });

  it('normalises CRLF input', () => {
    expect(parseAnswer('a\r\n\r\nb')).toEqual([
      { kind: 'paragraph', text: 'a' },
      { kind: 'paragraph', text: 'b' },
    ]);
  });

  it('preserves Chinese punctuation inside paragraphs', () => {
    const blocks = parseAnswer('他说：“好。”\n然后离开了。');
    expect(blocks[0]).toEqual({ kind: 'paragraph', text: '他说：“好。”\n然后离开了。' });
  });

  it('finds a fenced block published mid-line', () => {
    // Models often emit the whole answer as one line, as observed live.
    const body = '建议如下。 ```bash echo hello ``` 以上。';
    const blocks = parseAnswer(body);
    expect(blocks.map((block) => block.kind)).toEqual(['paragraph', 'code', 'paragraph']);
    expect(blocks[1]).toEqual({ kind: 'code', language: 'bash', text: 'echo hello' });
  });

  it('keeps a language tag on a mid-line fence', () => {
    const blocks = parseAnswer('示例：```ts const a = 1;```');
    expect(blocks[1]).toEqual({ kind: 'code', language: 'ts', text: 'const a = 1;' });
  });

  it('does not treat backticks inside code as a new fence', () => {
    const body = '```bash\necho `date`\n```';
    expect(parseAnswer(body)).toEqual([
      { kind: 'code', language: 'bash', text: 'echo `date`' },
    ]);
  });

  it('splits numbered steps that a model published inline', () => {
    const blocks = parseAnswer('1. 甲说明。 2. 乙说明。 3. 丙说明。');
    expect(blocks).toEqual([
      { kind: 'list', ordered: true, items: ['甲说明。', '乙说明。', '丙说明。'] },
    ]);
  });

  it('leaves a version number inline', () => {
    const blocks = parseAnswer('升级到 1.2 版本即可。');
    expect(blocks).toEqual([{ kind: 'paragraph', text: '升级到 1.2 版本即可。' }]);
  });

  it('splits inline bullets that follow a sentence', () => {
    const blocks = parseAnswer('要点如下。 - 甲。 - 乙');
    expect(blocks[1]).toEqual({ kind: 'list', ordered: false, items: ['甲。', '乙'] });
  });

  it('does not split a hyphen used as a dash inside a sentence', () => {
    // Only a marker after sentence punctuation is a list item; "甲 - 乙" is one
    // bullet whose text contains a dash.
    const blocks = parseAnswer('要点如下。 - 甲 - 乙');
    expect(blocks[1]).toEqual({ kind: 'list', ordered: false, items: ['甲 - 乙'] });
  });

  it('starts a list after a colon and numbers it from the published text', () => {
    const blocks = parseAnswer('我先给三条建议： 1. 甲。 2. 乙。 3. 丙。');
    expect(blocks).toEqual([
      { kind: 'paragraph', text: '我先给三条建议：' },
      { kind: 'list', ordered: true, items: ['甲。', '乙。', '丙。'] },
    ]);
  });

  it('lifts a closing sentence out of the last item', () => {
    const blocks = parseAnswer('建议： 1. 甲。 2. 乙。 如果你告诉我场景，我可以更具体。');
    expect(blocks[1]).toEqual({ kind: 'list', ordered: true, items: ['甲。', '乙。'] });
    expect(blocks[2]).toEqual({ kind: 'paragraph', text: '如果你告诉我场景，我可以更具体。' });
  });

  it('keeps a long item whole when it has no closing sentence', () => {
    const blocks = parseAnswer('1. 一项很长的说明，中间有停顿但没有结束');
    expect(blocks).toEqual([
      { kind: 'list', ordered: true, items: ['一项很长的说明，中间有停顿但没有结束'] },
    ]);
  });
});
