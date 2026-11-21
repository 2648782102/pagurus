import type { AgentChatModel, AgentChatReasoningEffort } from '../../shared/api/agent-chat.js';

/**
 * How a published level reads in Chinese.
 *
 * Only the levels that have a natural word are translated. Everything else —
 * `xhigh`, `max`, `ultra`, and whatever the gateway adds next — is shown as the
 * token the gateway uses, because a wrong translation is worse than a literal
 * one: a reader who sees "极深" cannot tell whether that is stronger than
 * "深入".
 */
const EFFORT_LABELS: Readonly<Record<string, string>> = {
  none: '不思考',
  low: '快速',
  medium: '均衡',
  high: '深入',
  xhigh: '极深',
  max: '最强',
  ultra: '极限',
};

export function effortLabel(effort: string): string {
  return EFFORT_LABELS[effort] ?? effort;
}

/**
 * What this message will run with, shown where the reader types.
 *
 * The model is a fact: it is fixed when the conversation is created, and
 * changing it means a new conversation, so the chip does not pretend to be a
 * menu.
 *
 * The effort is a choice. The Runtime accepts a per-turn override and adopts it
 * as the conversation's new default, so this is a real control — a native
 * `<select>` over exactly the levels this model publishes. When the model
 * publishes none, there is nothing to choose and the chip says so instead of
 * offering a menu that would change nothing.
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
      {/*
       * A native `<select>` carrying the chip's styling.
       *
       * Native because the alternatives are worse here: a custom listbox has to
       * re-implement keyboard navigation, type-ahead, and screen-reader
       * announcement, and this control sits inside a form where arrow keys are
       * already spoken for. The select is the one element every browser and
       * assistive technology agrees on.
       */}
      {canChoose && effort !== null ? (
        <label className="agent-composer-chip agent-composer-chip-select">
          {/*
           * The visible text is the label's own, not the select's: the select is
           * stretched over the chip and fully transparent so the native popup
           * still opens from anywhere in it, while the chip keeps the row's
           * height, font, and alignment. Without this span the control would be
           * an invisible select on an empty pill.
           */}
          <span className="agent-composer-chip-text">{effortLabel(effort)}</span>
          <select
            className="agent-composer-effort"
            value={effort}
            aria-label="思考强度"
            onChange={(event) => onEffortChange(event.target.value)}
          >
            {levels.map((level) => (
              <option key={level} value={level}>{effortLabel(level)}</option>
            ))}
          </select>
        </label>
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
