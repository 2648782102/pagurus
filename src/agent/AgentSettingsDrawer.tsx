import { useEffect, useRef, useState } from 'react';
import type { RuntimeInfo } from '../shared/api/runtime.js';
import { AgentSettingsPanel } from '../features/agents/AgentSettingsPanel.js';
import { ModelSettingsPanel } from '../features/agents/ModelSettingsPanel.js';
import { AgentIcon } from '../shared/ui/AgentIcon.js';

const SECTIONS = [
  { id: 'agent', label: 'Agent 与工具' },
  { id: 'model', label: '模型' },
  { id: 'about', label: '关于运行时' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

/** The single settings surface for the Agent product. */
export function AgentSettingsDrawer({
  open,
  runtime,
  onClose,
  onAgentsChanged,
}: {
  readonly open: boolean;
  readonly runtime: RuntimeInfo | null;
  readonly onClose: () => void;
  readonly onAgentsChanged: () => void;
}) {
  const [section, setSection] = useState<SectionId>('agent');
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="agent-settings-layer anim-fade-in" role="presentation" onMouseDown={onClose}>
      <div
        className="agent-settings anim-slide-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-settings-title"
        ref={panelRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="agent-settings-head">
          <h2 id="agent-settings-title">设置</h2>
          <button type="button" className="agent-settings-close" onClick={onClose} aria-label="关闭设置" ref={closeRef}>
            <AgentIcon name="close" size={15} />
          </button>
        </header>

        <nav className="agent-settings-nav" aria-label="设置分区">
          {SECTIONS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={section === entry.id ? 'is-active' : ''}
              aria-pressed={section === entry.id}
              onClick={() => setSection(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </nav>

        <div className="agent-settings-body">
          {section === 'agent' && <AgentSettingsPanel onAgentsChanged={onAgentsChanged} runtime={runtime} />}
          {section === 'model' && <ModelSettingsPanel runtime={runtime} />}
          {section === 'about' && (
            <section className="agent-settings-about" aria-label="关于运行时">
              <h3>运行时</h3>
              <dl>
                <div><dt>地址</dt><dd>{runtime ? '本机 Conchbase' : '尚未连接'}</dd></div>
                <div><dt>版本</dt><dd>{runtime?.version ?? '—'}</dd></div>
                <div><dt>能力</dt><dd>{runtime?.capabilities.length ?? 0} 项</dd></div>
              </dl>
              <p>配置由 Pagurus 呈现，执行、权限和持久化状态都由 Conchbase Runtime 持有。</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
