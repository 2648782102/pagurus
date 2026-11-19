import { useMemo } from 'react';
import {
  hasBlockStructure,
  parseAnswer,
  parseSpans,
  type AnswerSpan,
} from './agent-answer-format.js';

/**
 * The reading view of one answer.
 *
 * Plain prose stays plain. Only when the published text already contains a
 * fenced block, list, heading, or quote does this render structure — that keeps
 * a one-sentence reply visually identical to before while making a long answer
 * scannable.
 *
 * While the answer is still arriving, blocks are not parsed: re-parsing a
 * partial body renumbers lists and splits fences that are not closed yet, so the
 * paragraph would visibly re-flow several times per second. Inline emphasis is
 * stable per frame, so it is safe to render immediately.
 *
 * Every node is React text chosen by this file, so an answer cannot inject
 * markup.
 */
export function AgentAnswer({ body, streaming = false }: {
  readonly body: string;
  readonly streaming?: boolean;
}) {
  const blocks = useMemo(() => parseAnswer(body), [body]);

  if (streaming || !hasBlockStructure(blocks)) {
    return <p>{parseSpans(body).map(renderSpan)}</p>;
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
          case 'list': {
            const items = block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{parseSpans(item).map(renderSpan)}</li>
            ));
            return block.ordered ? <ol key={index}>{items}</ol> : <ul key={index}>{items}</ul>;
          }
          case 'heading':
            return <h4 key={index}>{parseSpans(block.text).map(renderSpan)}</h4>;
          case 'quote':
            return <blockquote key={index}>{parseSpans(block.text).map(renderSpan)}</blockquote>;
          case 'rule':
            return <hr key={index} />;
          case 'table':
            /*
             * A wide table must scroll rather than force the reading column
             * wider, so the wrapper owns the overflow and the table keeps its
             * natural width.
             */
            return (
              <div className="agent-answer-table" key={index}>
                <table>
                  <thead>
                    <tr>{block.head.map((cell, cellIndex) => (
                      <th key={cellIndex} scope="col">{parseSpans(cell).map(renderSpan)}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>{row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{parseSpans(cell).map(renderSpan)}</td>
                      ))}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return <p key={index}>{parseSpans(block.text).map(renderSpan)}</p>;
        }
      })}
    </div>
  );
}

/** One inline span; the element is chosen here, never by the answer text. */
function renderSpan(span: AnswerSpan, index: number) {
  if (span.kind === 'strong') return <strong key={index}>{span.text}</strong>;
  if (span.kind === 'emphasis') return <em key={index}>{span.text}</em>;
  if (span.kind === 'strike') return <del key={index}>{span.text}</del>;
  if (span.kind === 'code') return <code key={index}>{span.text}</code>;
  if (span.kind === 'link') {
    return <a key={index} href={span.href} target="_blank" rel="noreferrer noopener">{span.text}</a>;
  }
  return <span key={index}>{span.text}</span>;
}
