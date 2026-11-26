import { useEffect, useRef, useState } from 'react';
import type { RuntimeInfo } from '../shared/api/runtime.js';
import { AgentSettingsPanel } from '../features/agents/AgentSettingsPanel.js';
import { ModelSettingsPanel } from '../features/agents/ModelSettingsPanel.js';
import { AgentIcon } from '../shared/ui/AgentIcon.js';
import { DisclosureRow } from '../dsh/primitives/DisclosureRow.js';
import {
  IconEyeOutlineRegular,
  IconSettingsOutlineRegular,
} from '../dsh/primitives/icons/index.js';

const SECTIONS = [
  { id: 'agent', label: 'Agent 与工具', icon: 'agent' as const },
  { id: 'model', label: '模型', icon: 'model' as const },
  { id: 'about', label: '关于运行时', icon: 'extensions' as const },
  { id: 'appearance', label: '外观与工具', icon: 'agent' as const },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

/** The single settings surface for the Agent product. */
export function AgentSettingsDrawer({
  open,
  runtime,
  onClose,
  onAgentsChanged,
  theme,
  onToggleTheme,
  onOpenContext,
  onOpenDiagnostics,
}: {
  readonly open: boolean;
  readonly runtime: RuntimeInfo | null;
  readonly onClose: () => void;
  readonly onAgentsChanged: () => void;
  readonly theme: 'light' | 'dark';
  readonly onToggleTheme: () => void;
  readonly onOpenContext: () => void;
  readonly onOpenDiagnostics: () => void;
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
              <AgentIcon name={entry.icon} size={14} />
              {entry.label}
            </button>
          ))}
        </nav>

        <div className="agent-settings-body">
          {section === 'agent' && <AgentSettingsPanel onAgentsChanged={onAgentsChanged} runtime={runtime} />}
          {section === 'model' && <ModelSettingsPanel runtime={runtime} />}
          {section === 'appearance' && (
            <section className="agent-settings-actions" aria-label="外观与工具">
              <h3>外观与工具</h3>
              {/*
               * DSH's disclosure row, so the page reads as a list of process
               * lines with a trailing action rather than a label/button table.
               */}
              <div className="agent-settings-rows">
                <DisclosureRow
                  icon={<IconEyeOutlineRegular size={14} />}
                  title={`主题 · 当前${theme === 'dark' ? '深色' : '浅色'}`}
                  open
                  expandable={false}
                  onToggle={() => undefined}
                  headerAccessory={(
                    <button type="button" className="agent-settings-row-action" onClick={onToggleTheme}>
                      切换
                    </button>
                  )}
                >
                  <p className="agent-settings-row-note">两套配色来自同一组设计令牌。</p>
                </DisclosureRow>
                <DisclosureRow
                  icon={<IconSettingsOutlineRegular size={14} />}
                  title="对话上下文"
                  open
                  expandable={false}
                  onToggle={() => undefined}
                  headerAccessory={(
                    <button type="button" className="agent-settings-row-action" onClick={onOpenContext}>
                      打开
                    </button>
                  )}
                >
                  <p className="agent-settings-row-note">固定版本、能力边界与执行记录。</p>
                </DisclosureRow>
                <DisclosureRow
                  icon={<IconSettingsOutlineRegular size={14} />}
                  title="诊断"
                  open
                  expandable={false}
                  onToggle={() => undefined}
                  headerAccessory={(
                    <button type="button" className="agent-settings-row-action" onClick={onOpenDiagnostics}>
                      打开
                    </button>
                  )}
                >
                  <p className="agent-settings-row-note">运行时状态与支持信息。</p>
                </DisclosureRow>
              </div>
            </section>
          )}
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
