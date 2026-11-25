import type { ReactNode } from 'react';

const MAX_COLLAPSED = 240;

/** A Runtime notice body that keeps long delegated reports out of the reading line. */
export function runtimeNoticeBody(body: string): ReactNode {
  const compact = body.replace(/\s+/g, ' ').trim();
  if (compact.length <= MAX_COLLAPSED) return <p>{body}</p>;
  const summary = compact.slice(0, 96).trimEnd();
  return (
    <details className="agent-runtime-detail">
      <summary>{summary}…</summary>
      <p>{body}</p>
    </details>
  );
}
