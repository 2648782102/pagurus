import type { RefObject } from 'react';
import { Button } from '../dsh/primitives/Button.js';
import { StateDot, type StateDotState } from '../dsh/primitives/StateDot.js';

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
  threadsButtonRef: _unused_threadsButtonRef,
  onOpenThreads: _unused_onOpenThreads,
  onNewThread,
  contextOpen: _unused_contextOpen,
  onToggleContext: _unused_onToggleContext,
  contextButtonRef: _unused_contextButtonRef,
  theme: _unused_theme,
  onToggleTheme: _unused_onToggleTheme,
  diagnosticsOpen: _unused_diagnosticsOpen,
  onToggleDiagnostics: _unused_onToggleDiagnostics,
  diagnosticsButtonRef: _unused_diagnosticsButtonRef,
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
  void [_unused_threadsButtonRef, _unused_onOpenThreads, _unused_contextOpen, _unused_onToggleContext, _unused_contextButtonRef, _unused_theme, _unused_onToggleTheme, _unused_diagnosticsOpen, _unused_onToggleDiagnostics, _unused_diagnosticsButtonRef];
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
          <StateDot state={connectionDot(connectionState, pending)} />
          {pending ? '回复中' : connection}
        </span>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={settingsOpen}
          onClick={onOpenSettings}
          aria-expanded={settingsOpen}
          aria-controls="agent-settings-title"
        >
          菜单
        </Button>
        <Button variant="primary" size="sm" onClick={onNewThread}>
          新对话
        </Button>
      </div>
    </header>
  );
}

/**
 * The connection's semantic state, in DSH's own vocabulary.
 *
 * The status word is still rendered beside the dot: DSH's `StateDot` is
 * explicitly `aria-hidden` and is meant to be paired with text, so colour is
 * never the only signal.
 */
function connectionDot(state: string, pending: boolean): StateDotState {
  if (pending) return 'ongoing';
  if (state === 'connected') return 'done';
  if (state === 'checking') return 'ongoing';
  if (state === 'incompatible' || state === 'disconnected') return 'error';
  return 'idle';
}
