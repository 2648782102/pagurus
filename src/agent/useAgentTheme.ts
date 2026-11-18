import { useCallback, useEffect, useState } from 'react';

export type AgentTheme = 'light' | 'dark';

/**
 * In-memory light/dark preference for the Agent surface.
 *
 * Deliberately not persisted: the client boundary forbids browser storage,
 * and a theme is cosmetic, so a reload resetting to light is acceptable.
 */
export function useAgentTheme() {
  const [theme, setTheme] = useState<AgentTheme>('light');

  useEffect(() => {
    document.documentElement.dataset.agentTheme = theme;
    return () => { delete document.documentElement.dataset.agentTheme; };
  }, [theme]);

  const toggle = useCallback(() => setTheme((value) => value === 'dark' ? 'light' : 'dark'), []);
  return { theme, toggle };
}
