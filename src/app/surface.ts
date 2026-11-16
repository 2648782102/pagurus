/**
 * Which surface this document renders.
 *
 * One build, two entrances:
 * - `/` and every existing `#workspace` link keep the operator console, so no
 *   bookmarked console URL changes meaning.
 * - `?surface=agent` renders the shipped Agent app.
 *
 * Keying on a query parameter (not the hash) matters: the console owns the hash
 * for workspace routing, and the product must not collide with those anchors.
 */
export type Surface = 'console' | 'agent';

export const AGENT_SURFACE_PARAM = 'surface';
export const AGENT_SURFACE_VALUE = 'agent';

export function resolveSurface(search: string): Surface {
  const params = new URLSearchParams(search);
  return params.get(AGENT_SURFACE_PARAM) === AGENT_SURFACE_VALUE ? 'agent' : 'console';
}

export function agentSurfaceHref(): string {
  return `?${AGENT_SURFACE_PARAM}=${AGENT_SURFACE_VALUE}`;
}
