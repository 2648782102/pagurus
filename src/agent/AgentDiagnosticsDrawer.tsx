import type { RuntimeInfo } from '../shared/api/runtime.js';
import { RuntimeDataPanel } from '../features/runtime-status/RuntimeDataPanel.js';
import { AgentIcon } from '../shared/ui/AgentIcon.js';

/**
 * Diagnostics as a drawer, not a second product.
 *
 * The console already owns a tested panel for data location, checks, backup,
 * and the redacted support bundle. A person in the Agent surface should not
 * have to leave their conversation and learn a second URL to reach those
 * facts, so this component gives that same panel a narrow, dismissible home.
 */
export function AgentDiagnosticsDrawer({
  open,
  runtime,
  onClose,
}: {
  readonly open: boolean;
  readonly runtime: RuntimeInfo | null;
  readonly onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="agent-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="agent-diagnostics"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-diagnostics-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="agent-diagnostics-head">
          <h2 id="agent-diagnostics-title">诊断与支持</h2>
          <button type="button" className="agent-diagnostics-close" onClick={onClose} aria-label="关闭诊断">
            <AgentIcon name="close" size={14} />
          </button>
        </div>
        <div className="agent-diagnostics-body">
          <RuntimeDataPanel runtime={runtime} />
        </div>
      </section>
    </div>
  );
}
