import { useEffect, useRef, useState } from 'react';
import type { AgentChatModel } from '../shared/api/agent-chat.js';
import type { CapabilitySummary } from './useAgentCapabilities.js';
import { FactList } from '../shared/ui/primitives.js';

interface AgentModelMenuProps {
  /** `effort` is null when this conversation's model publishes no levels. */
  readonly pinned: {
    readonly provider: string;
    readonly model: string;
    readonly effort: string | null;
  } | null;
  readonly models: readonly AgentChatModel[];
  /**
   * Starts a fresh conversation.
   *
   * No longer the way to change models — the composer does that in place — but
   * still offered here, because starting over is its own intent and a reader
   * looking at "what is this conversation running on" is where they look for it.
   */
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
 * States what this conversation is running on.
 *
 * The model is changeable now, from the composer's model chip; this popover is
 * the read-out, not the control. It still offers "start a new conversation",
 * because that is a different intent: clearing the transcript rather than
 * continuing it on another model.
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
        {pinned?.effort != null && (
          <span className="agent-model-effort">思考 {EFFORT_LABELS[pinned.effort] ?? pinned.effort}</span>
        )}
        <span aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className="agent-model-popover anim-pop" role="dialog" aria-label="模特信息">
          <p className="agent-model-popover-title">当前使用</p>
          <FactList className="agent-model-facts" facts={[
            { label: '供应商', value: pinned?.provider ?? '未知' },
            { label: '模型', value: pinned?.model ?? '未知' },
            {
              label: '思考强度',
              value: pinned === null
                ? '未知'
                : pinned.effort === null
                  ? '该模型无档位'
                  : EFFORT_LABELS[pinned.effort] ?? pinned.effort,
            },
          ]} />
          <p className="agent-model-note">
            模型和思考强度都可以在输入框里随时切换，从下一条消息开始生效。
            当前目录共 {models.length} 个可选模型。
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
            开新对话
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
        Runtime 内建的Boss Agent：只能提议组织动作，由 Runtime 校验后执行。
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
