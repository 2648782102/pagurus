import type { useAgents } from './useAgents.js';
import { Button, Section } from '../../shared/ui/primitives.js';
import { RevisionComparison } from './RevisionComparison.js';

type AgentsController = ReturnType<typeof useAgents>;

export function AgentRevisionHistory({
  agents,
  busy,
  compareLeftId,
  compareRightId,
  defaultCompareLeftId,
  defaultCompareRightId,
  onLeftChange,
  onRightChange,
}: {
  readonly agents: AgentsController;
  readonly busy: boolean;
  readonly compareLeftId: string;
  readonly compareRightId: string;
  readonly defaultCompareLeftId: string;
  readonly defaultCompareRightId: string;
  readonly onLeftChange: (id: string) => void;
  readonly onRightChange: (id: string) => void;
}) {
  const selected = agents.selected;
  if (!selected) return null;

  return (
    <div className="agent-history">
      <Section title="版本历史" description={<>当前版本 <code>{selected.currentRevisionId}</code></>}>
        <ol className="revision-list">
          {[...selected.revisions].reverse().map((revision) => (
            <li key={revision.id}>
              <div>
                <strong>{revision.name}</strong>
                <code>{revision.id}</code>
                <small>{new Date(revision.createdAt).toLocaleString()}</small>
              </div>
              {revision.id === selected.currentRevisionId
                ? <span className="revision-current">当前</span>
                : <Button
                  size="sm"
                  type="button"
                  disabled={busy || selected.archived}
                  onClick={() => agents.rollback(revision.id)}
                >恢复此版本</Button>}
            </li>
          ))}
        </ol>
        <RevisionComparison
          revisions={selected.revisions}
          leftId={compareLeftId || defaultCompareLeftId}
          rightId={compareRightId || defaultCompareRightId}
          onLeftChange={onLeftChange}
          onRightChange={onRightChange}
        />
      </Section>
    </div>
  );
}
