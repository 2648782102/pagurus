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
    /*
     * DSH's token sheet keys its dark aliases off `body[data-ds-dark-theme]`.
     * Writing both attributes here keeps the vendored components and our own
     * tokens flipping in the same frame, with one source of truth for the
     * preference.
     */
    if (theme === 'dark') document.body.dataset.dsDarkTheme = '';
    else delete document.body.dataset.dsDarkTheme;
    return () => {
      delete document.documentElement.dataset.agentTheme;
      delete document.body.dataset.dsDarkTheme;
    };
  }, [theme]);

  /*
   * The switch is a one-off transition, not a permanent one.
   *
   * Every colour on the surface is a CSS variable, so flipping the theme
   * repaints all of them in one frame — the whole screen snaps from paper to
   * near-black. A transition on `background-color`/`color` everywhere would fix
   * that, but leaving it on makes every hover and every panel open animate at
   * the theme's duration instead of the control's.
   *
   * `data-theme-switching` exists only for the length of the cross-fade: the
   * stylesheet arms a broad colour transition while it is present, and the
   * attribute is removed after one frame plus the duration, restoring the
   * per-rule transitions.
   */
  const toggle = useCallback(() => {
    const root = document.documentElement;
    root.dataset.themeSwitching = 'true';
    setTheme((value) => value === 'dark' ? 'light' : 'dark');
    window.setTimeout(() => { delete root.dataset.themeSwitching; }, 320);
  }, []);
  return { theme, toggle };
}
