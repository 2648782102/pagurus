import type { AgentChatModel, AgentChatReasoningEffort } from '../../shared/api/agent-chat.js';

const EFFORT_LABELS: Readonly<Record<AgentChatReasoningEffort, string>> = {
  low: '快速',
  medium: '均衡',
  high: '深入',
};

/**
 * What this conversation is pinned to, shown where the reader types.
 *
 * These are chips, not menus: the model and the effort are fixed when the
 * conversation is created — the Runtime's `postMessage` takes only text and an
 * idempotency key — so a dropdown here would offer a choice that cannot be
 * honoured. The chip states the fact and the action beside it opens a fresh
 * conversation, which is the only way to change either.
 *
 * The toolbar is where a reader looks for "what applies to this message", which
 * is why the fact belongs here rather than in the page header above the thread.
 */
export function ComposerModes({
  model,
  effort,
  onNewThread,
}: {
  /** `magpie:deepseek-flash` or similar; the Runtime's reference for the model. */
  readonly model: string;
  readonly effort: AgentChatReasoningEffort;
  readonly onNewThread: () => void;
}) {
  return (
    <>
      <span className="agent-composer-chip" title="模型在对话创建时固定">
        <span className="agent-composer-chip-text">{shortModel(model)}</span>
      </span>
      <span className="agent-composer-chip" title="思考强度在对话创建时固定">
        <span className="agent-composer-chip-text">{EFFORT_LABELS[effort] ?? effort}</span>
      </span>
      <button
        type="button"
        className="agent-composer-chip agent-composer-chip-action"
        onClick={onNewThread}
        title="换模型或强度需要新开一段对话"
      >
        换模型
      </button>
    </>
  );
}

/** The model's own name, without the provider prefix the Runtime stores. */
function shortModel(reference: string): string {
  const separator = reference.indexOf(':');
  return separator >= 0 ? reference.slice(separator + 1) : reference;
}

/** The reference a conversation was created with, from the catalogue. */
export function modelReferenceOf(
  models: readonly AgentChatModel[],
  providerId: string,
  modelId: string,
): string {
  return models.find((model) => model.providerId === providerId && model.modelId === modelId)?.reference
    ?? `${providerId}:${modelId}`;
}
