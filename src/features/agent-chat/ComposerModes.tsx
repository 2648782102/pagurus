import type { AgentChatModel, AgentChatReasoningEffort } from '../../shared/api/agent-chat.js';
import { effortLabel } from '../../shared/ui/effort-label.js';
import { EffortMenu } from './EffortMenu.js';
import { ModelChip } from './ModelChip.js';

/**
 * What this message will run with, shown where the reader types.
 *
 * Both are choices, and both apply to the next message.
 *
 * The model used to be fixed at conversation creation, which made changing it
 * throw the transcript away. It is now a quiet menu: switching takes effect on
 * the next turn, and each reply records the model that produced it.
 *
 * The effort menu is built from exactly the levels the current model publishes.
 * When it publishes none, there is nothing to choose and the chip says so
 * instead of offering a menu that would change nothing.
 */
export function ComposerModes({
  model,
  models,
  effort,
  levels,
  onChangeModel,
  onEffortChange,
}: {
  /** `magpie:deepseek-flash` or similar; the Runtime's reference for the model. */
  readonly model: string;
  /** Every model a conversation may switch to. */
  readonly models: readonly AgentChatModel[];
  /** The level the next message will use, or null when the model has none. */
  readonly effort: AgentChatReasoningEffort | null;
  /** The levels this conversation's model publishes, weakest first. */
  readonly levels: readonly string[];
  readonly onChangeModel: (model: AgentChatModel) => void;
  readonly onEffortChange: (effort: string) => void;
}) {
  const canChoose = levels.length > 1;
  return (
    <>
      <ModelChip reference={model} models={models} onSelect={onChangeModel} />
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
    </>
  );
}

/** The reference a conversation is pinned to, from the catalogue. */
export function modelReferenceOf(
  models: readonly AgentChatModel[],
  providerId: string,
  modelId: string,
): string {
  return models.find((model) => model.providerId === providerId && model.modelId === modelId)?.reference
    ?? `${providerId}:${modelId}`;
}
