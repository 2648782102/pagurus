/**
 * Which surface this document renders.
 *
 * One build, two entrances. The Agent surface is the product, so it is the
 * default: `/` opens a conversation.
 *
 * The operator console stays reachable two ways, and neither is a redirect:
 * - `?surface=console` asks for it explicitly.
 * - A `#workspace` anchor (`#overview`, `#workbench-title`, …) still lands on
 *   the console, so every existing bookmark keeps its meaning. The console owns
 *   the hash for workspace routing; the Agent surface never reads it.
 *
 * `?surface=agent` remains valid and is what in-app links use.
 */
export type Surface = 'console' | 'agent';

export const AGENT_SURFACE_PARAM = 'surface';
export const AGENT_SURFACE_VALUE = 'agent';
export const CONSOLE_SURFACE_VALUE = 'console';

export function resolveSurface(search: string): Surface {
  const params = new URLSearchParams(search);
  const requested = params.get(AGENT_SURFACE_PARAM);
  if (requested === CONSOLE_SURFACE_VALUE) return 'console';
  if (requested === AGENT_SURFACE_VALUE) return 'agent';
  return 'agent';
}

/**
 * Full decision: an explicit parameter wins, then a console workspace anchor.
 *
 * Old console links look like `/#overview` or `/#workbench-title`. Landing
 * them on the Agent surface would silently break every bookmark, so a
 * non-empty workspace hash keeps the caller on the console.
 */
export function resolveSurfaceFromLocation(search: string, hash: string): Surface {
  const params = new URLSearchParams(search);
  if (params.get(AGENT_SURFACE_PARAM) !== null) return resolveSurface(search);
  return hash.length > 1 ? 'console' : 'agent';
}

export function agentSurfaceHref(): string {
  return `?${AGENT_SURFACE_PARAM}=${AGENT_SURFACE_VALUE}`;
}

export function consoleSurfaceHref(): string {
  return `?${AGENT_SURFACE_PARAM}=${CONSOLE_SURFACE_VALUE}`;
}
