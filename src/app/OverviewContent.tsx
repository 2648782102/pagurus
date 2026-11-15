import { RuntimeStatusPanel } from '../features/runtime-status/RuntimeStatusPanel.js';
import type { useRuntimeStatus } from '../features/runtime-status/useRuntimeStatus.js';
import { Section } from '../shared/ui/primitives.js';
import { QUICK_STARTS, WORKSPACE_GROUPS } from './workspace-registry.js';
import type { WorkspaceDefinition } from './useWorkspace.js';

type RuntimeStatus = ReturnType<typeof useRuntimeStatus>;

export function OverviewContent({
  runtimeStatus,
  workspaces,
}: {
  readonly runtimeStatus: RuntimeStatus;
  readonly workspaces: readonly WorkspaceDefinition[];
}) {
  const byId = new Map(workspaces.map((entry) => [entry.id, entry]));

  return (
    <>
      <section className="overview-deck" aria-labelledby="overview-deck-title">
        <div className="overview-runtime">
          <RuntimeStatusPanel {...runtimeStatus} />
        </div>
        <aside className="overview-launch" aria-labelledby="overview-deck-title">
          <p className="eyebrow">从这里开始</p>
          <h2 id="overview-deck-title">选一个入口</h2>
          <p className="overview-launch-note">
            海螺负责执行与权限；这个控制台只读取已发布状态，并提交 Runtime 已接受的操作。
          </p>
          <div className="overview-quick-list">
            {QUICK_STARTS.map((id) => {
              const entry = byId.get(id);
              if (!entry) return null;
              return (
                <a className="overview-quick-link" href={entry.href} key={entry.id}>
                  <span className="overview-quick-icon" aria-hidden="true">{entry.icon}</span>
                  <span>
                    <strong>{entry.label}</strong>
                    <small>{entry.hint}</small>
                  </span>
                  <span className="overview-quick-arrow" aria-hidden="true">↗</span>
                </a>
              );
            })}
          </div>
        </aside>
      </section>

      <Section
        className="overview-directory"
        id="directory-title"
        title="管理空间"
        description={`本地优先 · ${workspaces.length} 个工作区`}
      >
        <div className="directory-groups">
          {WORKSPACE_GROUPS.map((group) => (
            <article className="directory-group" key={group.title}>
              <h3>{group.title}</h3>
              <p>{group.note}</p>
              <div className="directory-list">
                {group.ids.map((id) => {
                  const entry = byId.get(id);
                  if (!entry) return null;
                  return (
                    <a className="directory-link" href={entry.href} key={entry.id}>
                      <span className="directory-icon" aria-hidden="true">{entry.icon}</span>
                      <span className="directory-copy">
                        <strong>{group.labels?.[entry.id] ?? entry.label}</strong>
                        <small>{entry.hint}</small>
                      </span>
                      <span className="directory-arrow" aria-hidden="true">→</span>
                    </a>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
