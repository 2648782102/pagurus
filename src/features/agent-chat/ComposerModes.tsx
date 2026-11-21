import type { AgentChatModel, AgentChatReasoningEffort } from '../../shared/api/agent-chat.js';
import { effortLabel } from '../../shared/ui/effort-label.js';
import { EffortMenu } from './EffortMenu.js';

/**
 * What this message will run with, shown where the reader types.
 *
 * The model is a fact: it is fixed when the conversation is created, and
 * changing it means a new conversation, so the chip does not pretend to be a
 * menu.
 *
 * The effort is a choice. The Runtime accepts a per-turn override and adopts it
 * as the conversation's new default, so this is a real control over exactly the
 * levels this model publishes. When the model publishes none, there is nothing
 * to choose and the chip says so instead of offering a menu that would change
 * nothing.
 */
export function ComposerModes({
  model,
  effort,
  levels,
  onEffortChange,
  onNewThread,
}: {
  /** `magpie:deepseek-flash` or similar; the Runtime's reference for the model. */
  readonly model: string;
  /** The level the next message will use, or null when the model has none. */
  readonly effort: AgentChatReasoningEffort | null;
  /** The levels this conversation's model publishes, weakest first. */
  readonly levels: readonly string[];
  readonly onEffortChange: (effort: string) => void;
  readonly onNewThread: () => void;
}) {
  const canChoose = levels.length > 1;
  return (
    <>
      <span className="agent-composer-chip" title="模型在对话创建时固定">
        <span className="agent-composer-chip-text">{shortModel(model)}</span>
      </span>
      {canChoose && effort !== null ? (
        <EffortMenu effort={effort} levels={levels} onChange={onEffortChange} />
      ) : (
        <span
          className="agent-composer-chip"
          title={levels.length === 0 ? '这个模型没有思考强度档位' : '这个模型只有一个思考档位'}
        >
          <span className="agent-composer-chip-text">
            {effort !== null ? effortLabel(effort) : '无档位'}
          </span>
        </span>
      )}
      <button
        type="button"
        className="agent-composer-chip agent-composer-chip-action"
        onClick={onNewThread}
        title="换模型需要新开一段对话"
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
