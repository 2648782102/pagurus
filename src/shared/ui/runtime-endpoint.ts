/**
 * The Runtime address this console is configured to proxy to.
 *
 * Vite defines `__PAGURUS_RUNTIME_URL__` from the same value that drives the
 * development proxy. The fallback keeps direct source/test renders useful.
 */
export function endpointHost(configured: string): string {
  try {
    return new URL(configured).host;
  } catch {
    return configured.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
}

export function runtimeEndpointLabel(): string {
  const configured = typeof __PAGURUS_RUNTIME_URL__ === 'string'
    ? __PAGURUS_RUNTIME_URL__
    : 'http://127.0.0.1:4318';
  return endpointHost(configured);
}
