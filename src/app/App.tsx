import { useCallback, useState } from 'react';
import { useRuntimeStatus } from '../features/runtime-status/useRuntimeStatus.js';
import { ConsoleSidebar } from './ConsoleSidebar.js';
import { ConsoleTopbar } from './ConsoleTopbar.js';
import { OverviewContent } from './OverviewContent.js';
import { PageHero } from './PageHero.js';
import { WorkspaceContent } from './WorkspaceContent.js';
import { useWorkspace } from './useWorkspace.js';

export function App() {
  const [agentRefreshToken, setAgentRefreshToken] = useState(0);
  const runtimeStatus = useRuntimeStatus();
  const workspace = useWorkspace();
  const current = workspace.current;
  const handleAgentsChanged = useCallback(() => {
    setAgentRefreshToken((value) => value + 1);
  }, []);
  const focusMain = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById('workspace-content')?.focus({ preventScroll: true });
  }, []);
  const activeBreadcrumb = current.id === 'overview' ? current.label : current.section;
  return (
    <div className="shell">
      <a className="skip-link" href="#workspace-content" onClick={focusMain}>跳到控制台内容</a>
      <ConsoleSidebar workspaces={workspace.workspaces} active={workspace.active} />

      <main id="workspace-content" className="console-main" tabIndex={-1}>
        <ConsoleTopbar breadcrumb={activeBreadcrumb} state={runtimeStatus.state} />

        <div className="workspace-page">
          <PageHero current={current} state={runtimeStatus.state} />

          <div className="workspace-content" aria-live="off">
            {workspace.active === 'overview'
              ? <OverviewContent
                runtimeStatus={{
                  state: runtimeStatus.state,
                  health: runtimeStatus.health,
                  runtime: runtimeStatus.runtime,
                  error: runtimeStatus.error,
                  refresh: runtimeStatus.refresh,
                }}
                workspaces={workspace.workspaces}
              />
              : <WorkspaceContent
                id={workspace.active}
                runtime={runtimeStatus.runtime}
                agentRefreshToken={agentRefreshToken}
                onAgentsChanged={handleAgentsChanged}
              />}
          </div>

          <footer className="page-footer"><span>Pagurus · 寄居蟹</span><span>配置在此管理，执行由 Conchbase 负责。</span></footer>
        </div>
      </main>
    </div>
  );
}
