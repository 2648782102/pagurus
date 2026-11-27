import { Suspense, lazy } from 'react';
import type { MarkdownLabels } from '../dsh/upstream/primitives/markdown/MarkdownText.js';

/**
 * One answer, rendered by DSH's own markdown pipeline.
 *
 * `MarkdownText` is the vendored component from `ui-primitives`: DSH's GFM +
 * TeX grammar, its incremental streaming parser, its KaTeX rendering, its
 * sanitised link and image handling, and its shiki-highlighted code blocks.
 * The runtime answer is untrusted text, which is exactly the input this
 * renderer was written for; it never renders raw HTML as markup and drops
 * `javascript:`/`data:`/`blob:` destinations.
 *
 * The import is lazy for one measured reason: the parser, katex, and the
 * highlighter core are ~1 MB, and they are needed only when a reply exists.
 * Loading them with the shell delayed the composer for content that may never
 * arrive. The placeholder is the message's own text, so the swap does not move
 * the reader's place.
 */
const MarkdownText = lazy(async () => {
  const module = await import('../dsh/upstream/primitives/markdown/MarkdownText.js');
  return { default: module.MarkdownText };
});

/** Localized chrome for the vendored renderer, which takes copy as props. */
const LABELS: MarkdownLabels = Object.freeze({
  code: Object.freeze({
    copyLabel: '复制代码',
    copiedLabel: '已复制',
    toolbarLabels: Object.freeze({
      codeLabel: '代码',
      wrapLabel: '自动换行',
      unwrapLabel: '取消换行',
    }),
  }),
  footnotes: '脚注',
});

export function AgentAnswer({ body, streaming = false }: {
  readonly body: string;
  readonly streaming?: boolean;
}) {
  return (
    <div className="agent-answer">
      <Suspense
        /*
         * Plain text while the renderer loads: the same words, without the
         * structure. It occupies the space the rendered answer will, so the
         * thread does not jump when the module lands.
         */
        fallback={<p className="agent-answer-loading">{body}</p>}
      >
        <MarkdownText
          text={body}
          streaming={streaming}
          labels={LABELS}
          variant="body"
        />
      </Suspense>
    </div>
  );
}
