import { useMemo } from 'react';
import { parseAnswer, hasBlockStructure } from './agent-answer-format.js';

/**
 * The reading view of one answer.
 *
 * Plain prose stays plain. Only when the published text already contains a
 * fenced block, list, heading, or quote does this render structure — that keeps
 * a one-sentence reply visually identical to before while making a long answer
 * scannable. Every node is React text, so an answer cannot inject markup.
 *
 * While the answer is still arriving it is rendered as a single run of text.
 * Re-parsing a partial body renumbers lists and splits code fences that are not
 * closed yet, so the paragraph would visibly re-flow several times per second.
 * Structure appears once, when the body has stopped changing.
 */
export function AgentAnswer({ body, streaming = false }: {
  readonly body: string;
  readonly streaming?: boolean;
}) {
  const blocks = useMemo(() => parseAnswer(body), [body]);

  if (streaming || !hasBlockStructure(blocks)) {
    return <p>{body}</p>;
  }

  return (
    <div className="agent-answer">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'code':
            return (
              <figure className="agent-answer-code" key={index}>
                {block.language && <figcaption>{block.language}</figcaption>}
                <pre><code>{block.text}</code></pre>
              </figure>
            );
          case 'list':
            return block.ordered
              ? <ol key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ol>
              : <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>;
          case 'heading':
            return <h4 key={index}>{block.text}</h4>;
          case 'quote':
            return <blockquote key={index}>{block.text}</blockquote>;
          default:
            return <p key={index}>{block.text}</p>;
        }
      })}
    </div>
  );
}
