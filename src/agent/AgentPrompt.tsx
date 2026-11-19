import type { KeyboardEvent } from 'react';
import type {
  AgentChatAgent,
  AgentChatModel,
  AgentChatReasoningEffort,
} from '../shared/api/agent-chat.js';
import { agentErrorText } from './agent-error-text.js';

export interface AgentPromptProps {
  readonly agents: readonly AgentChatAgent[];
  readonly selectedAgentId: string;
  readonly models: readonly AgentChatModel[];
  readonly selectedModelReference: string;
  readonly reasoningEffort: AgentChatReasoningEffort;
  readonly draft: string;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSelectAgent: (agentId: string) => void;
  readonly onSelectModel: (reference: string) => void;
  readonly onSelectEffort: (effort: AgentChatReasoningEffort) => void;
  readonly onDraftChange: (value: string) => void;
  readonly onSubmit: () => void;
}

const EFFORT_OPTIONS: readonly { value: AgentChatReasoningEffort; label: string }[] = [
  { value: 'low', label: '快速' },
  { value: 'medium', label: '均衡' },
  { value: 'high', label: '深入' },
];

/**
 * The entry moment: one question in the middle of an empty page.
 *
 * The previous landing screen asked the person to configure three things before
 * they could say anything. Here the prompt comes first and the three settings
 * sit underneath it as small, secondary choices — defaults are already chosen,
 * so nobody has to touch them to start.
 */
export function AgentPrompt({
  agents,
  selectedAgentId,
  models,
  selectedModelReference,
  reasoningEffort,
  draft,
  busy,
  error,
  onSelectAgent,
  onSelectModel,
  onSelectEffort,
  onDraftChange,
  onSubmit,
}: AgentPromptProps) {
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
  const canSend = draft.trim().length > 0 && !busy && selectedAgentId.length > 0;

  const submit = () => {
    if (!canSend) return;
    onSubmit();
  };

  return (
    <div className="agent-prompt">
      <h1 className="agent-prompt-title">
        {selectedAgent ? `和 ${selectedAgent.name} 说点什么` : '还没有可对话的 Agent'}
      </h1>
      <p className="agent-prompt-sub">
        {selectedAgent
          ? '说出你的问题或目标。回答会固定记录所用的模型版本。'
          : 'Runtime 没有返回可用的 Agent。通常是 provider 或模型目录还没配置好；到控制台的运行时状态页确认后刷新即可。'}
      </p>

      <form
        className="agent-prompt-box"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor="agent-prompt-input">输入消息</label>
        <textarea
          id="agent-prompt-input"
          value={draft}
          rows={3}
          placeholder="输入消息，Enter 发送"
          disabled={busy || !selectedAgent}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
            // Committing an IME candidate also fires Enter; sending here would
            // cut off a sentence that is still being composed.
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="agent-prompt-toolbar">
          <div className="agent-prompt-picks">
            {agents.length > 1 && (
              <label className="agent-prompt-pick">
                <span>Agent</span>
                <select
                  value={selectedAgentId}
                  onChange={(event) => onSelectAgent(event.target.value)}
                  disabled={busy}
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="agent-prompt-pick">
              <span>模型</span>
              <select
                value={selectedModelReference}
                onChange={(event) => onSelectModel(event.target.value)}
                disabled={busy || models.length === 0}
              >
                {models.length === 0 && <option value="">暂无模型</option>}
                {models.map((model) => (
                  <option key={model.reference} value={model.reference}>{model.displayName}</option>
                ))}
              </select>
            </label>
            <label className="agent-prompt-pick">
              <span>思考</span>
              <select
                value={reasoningEffort}
                onChange={(event) => onSelectEffort(event.target.value as AgentChatReasoningEffort)}
                disabled={busy}
              >
                {EFFORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="agent-prompt-send" disabled={!canSend} aria-label="发送消息">
            {busy ? '…' : '↑'}
          </button>
        </div>
      </form>

      <p className="agent-prompt-hint">Enter 发送，Shift + Enter 换行</p>
      {error && (
        <p className="agent-prompt-error" role="alert">
          {agentErrorText(new Error(error), '没有发出去，请再试一次。')}
        </p>
      )}
    </div>
  );
}
