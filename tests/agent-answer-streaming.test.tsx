// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentAnswer } from '../src/agent/AgentAnswer.js';

afterEach(() => cleanup());

describe('AgentAnswer while streaming', () => {
  it('renders a partial body as one paragraph, not re-parsed blocks', () => {
    // A half-received fence would otherwise become a code block, then flip back
    // to prose on the next frame — the visible re-flow that read as bad typing.
    const partial = '建议如下。 ```bash echo hi';
    const { container } = render(<AgentAnswer body={partial} streaming />);

    expect(container.querySelectorAll('pre')).toHaveLength(0);
    expect(container.querySelectorAll('ul, ol')).toHaveLength(0);
    expect(screen.getByText(/建议如下/)).toBeTruthy();
  });

  it('renders the same body as structured blocks once it settles', () => {
    const body = '建议如下。\n```bash\necho hi\n```\n以上。';
    const { container } = render(<AgentAnswer body={body} />);

    expect(container.querySelectorAll('pre')).toHaveLength(1);
  });

  it('keeps markup inert', () => {
    const { container } = render(<AgentAnswer body={'<img src=x onerror=alert(1)>'} />);
    expect(container.querySelector('img')).toBeNull();
  });
});
