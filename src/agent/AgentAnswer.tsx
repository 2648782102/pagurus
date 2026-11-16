import { useMemo } from 'react';
import { parseAnswer, hasBlockStructure } from './agent-answer-format.js';

/**
 * The reading view of one answer.
 *
 * Plain prose stays plain. Only when the published text already contains a
 * fenced block, list, heading, or quote does this render structure — that keeps
 * a one-sentence reply visually identical to before while making a long answer
 * scannable. Every node is React text, so an answer cannot inject markup.
 */
export function AgentAnswer({ body }: { readonly body: string }) {
  const blocks = useMemo(() => parseAnswer(body), [body]);

  if (!hasBlockStructure(blocks)) {
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
