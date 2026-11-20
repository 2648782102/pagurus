import { useEffect, useRef, useState } from 'react';
import type { AgentChatModel } from '../shared/api/agent-chat.js';
import type { CapabilitySummary } from './useAgentCapabilities.js';
import { FactList } from '../shared/ui/primitives.js';

interface AgentModelMenuProps {
  readonly pinned: { readonly provider: string; readonly model: string; readonly effort: string } | null;
  readonly models: readonly AgentChatModel[];
  /** Starts a fresh conversation, the only way to change the pinned model. */
  readonly onStartNew: () => void;
  readonly capabilities: CapabilitySummary;
  /** Called the first time the popover opens, so grants load on demand. */
  readonly onInspect: () => void;
}

const EFFORT_LABELS: Readonly<Record<string, string>> = {
  low: '低',
  medium: '中',
  high: '高',
};

/**
 * Shows which model the current conversation is pinned to.
 *
 * Conchbase pins provider/model/effort when a conversation is created, and the
 * published contract has no "change model of an existing conversation" write.
 * The menu therefore offers the truthful action — start a new conversation —
 * instead of a dropdown that would look functional and do nothing.
 */
export function AgentModelMenu({
  pinned,
  models,
  onStartNew,
  capabilities,
  onInspect,
}: AgentModelMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const label = pinned ? pinned.model : '未知模型';

  return (
    <div className="agent-model-menu" ref={containerRef}>
      <button
        type="button"
        className="agent-model-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`对话模型：${label}`}
        onClick={() => {
          setOpen((value) => !value);
          onInspect();
        }}
      >
        <span className="agent-model-name">{label}</span>
        {pinned && <span className="agent-model-effort">思考 {EFFORT_LABELS[pinned.effort] ?? pinned.effort}</span>}
        <span aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className="agent-model-popover" role="dialog" aria-label="模特信息">
          <p className="agent-model-popover-title">本次对话固定使用</p>
          <FactList className="agent-model-facts" facts={[
            { label: '供应商', value: pinned?.provider ?? '未知' },
            { label: '模型', value: pinned?.model ?? '未知' },
            { label: '思考强度', value: pinned ? EFFORT_LABELS[pinned.effort] ?? pinned.effort : '未知' },
          ]} />
          <p className="agent-model-note">
            模型在对话创建时固定；换模型需要新开一段对话。当前目录共 {models.length} 个可选模型。
          </p>
          <CapabilityLine capabilities={capabilities} />
          <button
            type="button"
            className="agent-model-new"
            onClick={() => {
              setOpen(false);
              onStartNew();
            }}
          >
            用新模型开新对话
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * States the capability boundary in user terms.
 *
 * Conchbase grants tools and skills per Agent revision; a person deciding what
 * to ask needs that in plain language rather than as a permission table.
 */
function CapabilityLine({ capabilities }: { readonly capabilities: CapabilitySummary }) {
  if (capabilities.phase === 'idle' || capabilities.phase === 'loading') {
    return <p className="agent-model-note agent-model-capability">正在读取能力授权…</p>;
  }
  if (capabilities.phase === 'builtin') {
    return (
      <p className="agent-model-note agent-model-capability">
        Runtime 内建的老板 Agent：只能提议组织动作，由 Runtime 校验后执行。
      </p>
    );
  }
  if (capabilities.phase === 'error') {
    return <p className="agent-model-note agent-model-capability">能力授权暂不可读：{capabilities.message}</p>;
  }
  const tools = capabilities.grants.filter((grant) => grant.kind === 'tool');
  const skills = capabilities.grants.filter((grant) => grant.kind === 'skill');
  if (tools.length === 0 && skills.length === 0) {
    return (
      <p className="agent-model-note agent-model-capability">
        这个 Agent 没有授权工具或 Skill：它只能用对话回答，不能读取文件、执行命令或联网。
      </p>
    );
  }
  return (
    <p className="agent-model-note agent-model-capability">
      这个 Agent 可调用 {tools.length} 个工具、{skills.length} 个 Skill
      {tools.length > 0 && <>（{tools.map((grant) => grant.name).join('、')}）</>}
      。每次写操作仍由 Runtime 审批。
    </p>
  );
}
