import type { RefObject } from 'react';
import { Button } from '../shared/ui/primitives.js';

/**
 * The product's only persistent chrome: one thin bar.
 *
 * The previous shell kept a full navigation rail open at all times, which put
 * an operator's map in front of a person who only wants to think out loud.
 * Here the chrome is a single line: identity on the left, the two things you
 * might actually want (your threads, a new one) on the right.
 */
export function AgentChrome({
  agentName,
  threadTitle,
  connection,
  connectionState,
  pending,
  threadsButtonRef,
  onOpenThreads,
  onNewThread,
  contextOpen,
  onToggleContext,
  contextButtonRef,
  theme,
  onToggleTheme,
  diagnosticsOpen,
  onToggleDiagnostics,
  diagnosticsButtonRef,
  settingsOpen,
  onOpenSettings,
}: {
  readonly agentName: string;
  readonly threadTitle: string | null;
  readonly connection: string;
  readonly connectionState: string;
  readonly pending: boolean;
  /** Focus returns here when the history sheet closes. */
  readonly threadsButtonRef: RefObject<HTMLButtonElement | null>;
  readonly onOpenThreads: () => void;
  readonly onNewThread: () => void;
  /** Whether the context panel is showing; the action stays pressed while it is. */
  readonly contextOpen: boolean;
  readonly onToggleContext: () => void;
  /** Focus returns here when the context rail closes. */
  readonly contextButtonRef?: RefObject<HTMLButtonElement | null>;
  readonly theme: 'light' | 'dark';
  readonly onToggleTheme: () => void;
  /** Whether the diagnostics drawer is showing. */
  readonly diagnosticsOpen: boolean;
  readonly onToggleDiagnostics: () => void;
  readonly diagnosticsButtonRef: RefObject<HTMLButtonElement | null>;
  readonly settingsOpen: boolean;
  readonly onOpenSettings: () => void;
}) {
  return (
    <header className="agent-chrome">
      <div className="agent-chrome-identity">
        <span className="agent-chrome-mark" aria-hidden="true">P</span>
        <span className="agent-chrome-name">{agentName}</span>
        {threadTitle && (
          <>
            <span className="agent-chrome-divider" aria-hidden="true" />
            <span className="agent-chrome-thread" title={threadTitle}>{threadTitle}</span>
          </>
        )}
      </div>

      <div className="agent-chrome-actions">
        <span className={`agent-chrome-status status-${connectionState}`} role="status">
          <span className="agent-chrome-dot" aria-hidden="true" />
          {pending ? '回复中' : connection}
        </span>
        <Button shape="pill" onClick={onToggleTheme}
          aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}>
          {theme === 'dark' ? '浅色' : '深色'}
        </Button>
        <Button
          shape="pill"
          pressed={diagnosticsOpen}
          onClick={onToggleDiagnostics}
          buttonRef={diagnosticsButtonRef}
          aria-expanded={diagnosticsOpen}
          aria-controls="agent-diagnostics-title"
        >
          诊断
        </Button>
        <Button
          shape="pill"
          pressed={settingsOpen}
          onClick={onOpenSettings}
          aria-expanded={settingsOpen}
          aria-controls="agent-settings-title"
        >
          菜单
        </Button>
        <Button buttonRef={threadsButtonRef} shape="pill" onClick={onOpenThreads}>
          对话记录
        </Button>
        <Button
          shape="pill"
          pressed={contextOpen}
          onClick={onToggleContext}
          buttonRef={contextButtonRef}
          aria-expanded={contextOpen}
          aria-controls="agent-context"
        >
          上下文
        </Button>
        <Button shape="pill" variant="primary" onClick={onNewThread}>
          新对话
        </Button>
      </div>
    </header>
  );
}
