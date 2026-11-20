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

    fireEvent.click(screen.getByRole('button', { name: '复制代码' }));
    await waitFor(() => expect(written).toEqual([code]));
    expect(await screen.findByRole('button', { name: '已复制代码' })).toBeTruthy();
  });

  it('still labels a block that has no language', () => {
    render(<AgentAnswer body={'```\nplain\n```'} />);
    expect(screen.getByText('代码')).toBeTruthy();
    expect(screen.getByRole('button', { name: '复制代码' })).toBeTruthy();
  });
});
