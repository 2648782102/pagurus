import type { AgentChatModel } from '../api/agent-chat.js';

/**
 * A model reference, split into something a person reads.
 *
 * References are `providerId:modelId`, and the model id itself can contain a
 * slash (`codex/gpt-5.6-terra`), so the provider is everything before the first
 * colon and the name is everything after it. Splitting on the last colon would
 * break any gateway that puts one in a model name; splitting on the slash would
 * break the model into a vendor and a name that the catalogue already has.
 */
export interface ModelLabel {
  readonly name: string;
  readonly provider: string;
  readonly reference: string;
}

export function modelLabel(
  reference: string,
  catalog: readonly AgentChatModel[] = [],
): ModelLabel {
  const separator = reference.indexOf(':');
  const provider = separator >= 0 ? reference.slice(0, separator) : '';
  const id = separator >= 0 ? reference.slice(separator + 1) : reference;
  const known = catalog.find((model) => model.reference === reference);
  return {
    name: known?.displayName ?? id,
    provider: known?.providerId ?? provider,
    reference,
  };
}

/** The catalogue name when it is known, otherwise the id from the reference. */
export function modelName(reference: string, catalog: readonly AgentChatModel[] = []): string {
  return modelLabel(reference, catalog).name;
}
