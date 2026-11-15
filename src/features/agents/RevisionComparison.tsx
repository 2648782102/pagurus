import { Field, Select } from '../../shared/ui/primitives.js';
import type { AgentRevision } from '../../shared/api/agents.js';
import { formatGrants } from './agent-revisions.js';

export function RevisionComparison({
  revisions,
  leftId,
  rightId,
  onLeftChange,
  onRightChange,
}: {
  readonly revisions: readonly AgentRevision[];
  readonly leftId: string;
  readonly rightId: string;
  readonly onLeftChange: (id: string) => void;
  readonly onRightChange: (id: string) => void;
}) {
  const left = revisions.find((revision) => revision.id === leftId);
  const right = revisions.find((revision) => revision.id === rightId);
  const hasComparison = revisions.length > 1 && left && right && left.id !== right.id;

  return (
    <div className="revision-compare" aria-labelledby="revision-compare-title">
      <div className="section-heading">
        <div><p className="eyebrow">REVISION COMPARE</p><h3 id="revision-compare-title">比较两个版本</h3></div>
        <span className="muted-label">只读比较</span>
      </div>
      {revisions.length < 2 ? <p className="task-hint">至少保存两个版本后才能比较。</p> : <>
        <div className="revision-compare-selects">
          <Field label="版本 A" htmlFor="revision-compare-left">
            <Select id="revision-compare-left" value={leftId} onChange={(event) => onLeftChange(event.target.value)}>
              {revisions.map((revision) => <option key={revision.id} value={revision.id}>{revision.name} · {revision.id}</option>)}
            </Select>
          </Field>
          <Field label="版本 B" htmlFor="revision-compare-right">
            <Select id="revision-compare-right" value={rightId} onChange={(event) => onRightChange(event.target.value)}>
              {revisions.map((revision) => <option key={revision.id} value={revision.id}>{revision.name} · {revision.id}</option>)}
            </Select>
          </Field>
        </div>
        {!hasComparison && <p className="task-hint">请选择两个不同的版本。</p>}
        {hasComparison && <div className="revision-compare-grid">
          <CompareField label="名称" left={left.name} right={right.name} />
          <CompareField label="Instructions" left={left.instructions} right={right.instructions} multiline />
          <CompareField label="默认模型" left={`${left.providerId} / ${left.modelId}`} right={`${right.providerId} / ${right.modelId}`} />
          <CompareField
            label="能力授权"
            left={formatGrants(left.grantedCapabilities)}
            right={formatGrants(right.grantedCapabilities)}
            multiline
          />
          <CompareField label="版本 id" left={left.id} right={right.id} mono />
        </div>}
      </>}
    </div>
  );
}

function CompareField({
  label,
  left,
  right,
  multiline = false,
  mono = false,
}: {
  readonly label: string;
  readonly left: string;
  readonly right: string;
  readonly multiline?: boolean;
  readonly mono?: boolean;
}) {
  const changed = left !== right;
  return (
    <div className={`compare-field${changed ? ' is-changed' : ''}`}>
      <dt>{label}{changed ? ' · 已变化' : ' · 相同'}</dt>
      <dd className={mono ? 'compare-mono' : undefined}><span>{left || '（空）'}</span><span>{right || '（空）'}</span></dd>
      {multiline && <small>版本 A / 版本 B</small>}
    </div>
  );
}
