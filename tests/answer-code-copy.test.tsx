// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentAnswer } from '../src/agent/AgentAnswer.js';

describe('code block copy', () => {
  afterEach(cleanup);

  it('copies the whole block, not the visible fragment', async () => {
    const written: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (text: string) => { written.push(text); return Promise.resolve(); } },
    });

    const code = 'npm run check\nnpm test\nnpm run build';
    render(<AgentAnswer body={'说明\n\n```bash\n' + code + '\n```'} />);

    /*
     * The renderer is imported lazily, so the fence and its toolbar appear one
     * tick after the paragraph does.
     */
    fireEvent.click(await screen.findByRole('button', { name: '复制代码' }));
    await waitFor(() => expect(written).toEqual([code]));
    /*
     * DSH's code toolbar swaps the button's accessible label from `copyLabel`
     * to `copiedLabel` and its glyph from copy to a check. The label is
     * "已复制" — the word the vendored toolbar was given — not a noun phrase of
     * ours.
     */
    expect(await screen.findByRole('button', { name: '已复制' })).toBeTruthy();
  });

  it('still labels a block that has no language', async () => {
    render(<AgentAnswer body={'```\nplain\n```'} />);
    // The toolbar shows the localized fallback for a fence without a language.
    expect(await screen.findByText('代码', {}, { timeout: 2000 })).toBeTruthy();
    expect(screen.getByRole('button', { name: '复制代码' })).toBeTruthy();
  });
});
