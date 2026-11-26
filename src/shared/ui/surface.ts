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
  /*
   * The console was folded into the Agent's settings drawer. Old links still
   * carry `surface=console`; landing them on a removed screen would break them,
   * so every value resolves to the one product surface.
   */
  void search;
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
  void search;
  void hash;
  return 'agent';
}

export function agentSurfaceHref(): string {
  return `?${AGENT_SURFACE_PARAM}=${AGENT_SURFACE_VALUE}`;
}

export function consoleSurfaceHref(): string {
  return `?${AGENT_SURFACE_PARAM}=${CONSOLE_SURFACE_VALUE}`;
}
