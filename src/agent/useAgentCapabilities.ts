import { useCallback, useRef, useState } from 'react';
import { getAgent, type CapabilityGrant } from '../shared/api/agents.js';

export type CapabilitySummary =
  | { readonly phase: 'idle' }
  | { readonly phase: 'loading' }
  | { readonly phase: 'ready'; readonly grants: readonly CapabilityGrant[] }
  | { readonly phase: 'error'; readonly message: string };

/**
 * Reads the pinned revision's granted capabilities, on demand.
 *
 * The Agent Chat contract does not carry grants, so a product surface that
 * wants to explain "what this Agent can do" must read the Agent revision. That
 * is a second request, so it happens when the user asks for the detail rather
 * than on every conversation render.
 */
export function useAgentCapabilities() {
  const [state, setState] = useState<CapabilitySummary>({ phase: 'idle' });
  const loadedFor = useRef<string | null>(null);

  const load = useCallback(async (agentId: string | undefined, revisionId: string | undefined) => {
    if (!agentId || !revisionId) {
      setState({ phase: 'idle' });
      return;
    }
    // One read per Agent per mount: the popover can be reopened freely.
    if (loadedFor.current === agentId) return;
    loadedFor.current = agentId;
    setState({ phase: 'loading' });
    try {
      const agent = await getAgent(agentId);
      setState({
        phase: 'ready',
        grants: agent.revisions.find((revision) => revision.id === revisionId)?.grantedCapabilities ?? [],
      });
    } catch (cause) {
      // Allow a later attempt to retry a failed read.
      loadedFor.current = null;
      setState({
        phase: 'error',
        message: cause instanceof Error ? cause.message : '无法读取能力授权',
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ phase: 'idle' });
    loadedFor.current = null;
  }, []);

  return { capabilities: state, load, reset };
}
