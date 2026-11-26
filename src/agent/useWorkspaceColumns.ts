import { useCallback, useEffect, useRef, useState } from 'react';
import { computeColumns, SIDEBAR_COLLAPSED } from '../dsh/layout/columns.js';

/**
 * DSH's column solver, applied to the Boss workbench.
 *
 * The workbench is the same three-track problem DSH's `AppFrame` solves: a
 * left rail that never concedes, a centre column with a reading minimum, and a
 * right panel that shrinks and then loses its track. Using DSH's
 * `computeColumns` rather than another set of media queries means the surface
 * breaks at the same widths, for the same reason, as the reference client —
 * and that the rule is testable as arithmetic instead of by screenshot.
 *
 * The work rail is the sidebar (fixed at `WORK_RAIL`); the insight panel is
 * the rightbar. Below the docked breakpoint the rail is hidden and both tracks
 * are zero, which is the same answer the solver gives at narrow widths.
 */
export const WORK_RAIL_WIDTH = 320;
export const INSIGHT_WIDTH = 320;
/** Below this the work rail is an overlay strip, not a column. */
export const WORKBENCH_DOCK_BREAKPOINT = 900;
/** DSH collapses its sidebar to an icon rail below this; ours hides it. */
export const WORKBENCH_RAIL_BREAKPOINT = 900;

export type WorkspaceColumns = {
  readonly work: number;
  readonly insight: number;
  /** True when the insight panel is drawn as a track rather than an overlay. */
  readonly insightDocked: boolean;
};

export function workspaceColumns(
  width: number,
  options: { readonly hasInsight: boolean; readonly docked: boolean },
): WorkspaceColumns {
  if (!options.docked) return { work: 0, insight: 0, insightDocked: false };
  const solved = computeColumns(
    width,
    WORK_RAIL_WIDTH,
    options.hasInsight ? INSIGHT_WIDTH : 0,
    SIDEBAR_COLLAPSED,
  );
  return {
    work: solved.sidebar,
    insight: solved.rightbar,
    insightDocked: solved.rightbar > 0,
  };
}

/**
 * Measures the workbench and reports the solved tracks.
 *
 * Element width, not viewport width: the rail and the window chrome are
 * already subtracted by the time the workspace gets its box, and solving
 * against the viewport would double-count them.
 */
export function useWorkspaceColumns(
  options: { readonly hasInsight: boolean; readonly enabled: boolean },
): WorkspaceColumns & { readonly ref: (node: HTMLDivElement | null) => void } {
  /*
   * A callback ref, not an effect on a `useRef` handle.
   *
   * The workbench mounts *after* the first render — a conversation is null
   * until the Runtime answers — so an effect keyed on `[]` ran once against a
   * null node and never measured. The surface then kept the CSS fallback at
   * every width, which looked correct at 1920 and silently disabled DSH's
   * track-shedding below it.
   */
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [width, setWidth] = useState(0);

  const ref = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    nodeRef.current = node;
    if (node === null) {
      setWidth(0);
      return;
    }
    setWidth(node.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  /*
   * The solved tracks are written as CSS custom properties through CSSOM.
   *
   * This surface does not allow inline `style` attributes (the architecture
   * guard forbids them, because a presentation decision written in the markup
   * cannot be reviewed beside the stylesheet it belongs to). A custom property
   * is data, not a declaration: `setProperty` lets the stylesheet own the
   * geometry and this hook own only the numbers.
   */
  useEffect(() => {
    const node = nodeRef.current;
    if (!node || width === 0) return;
    const solved = workspaceColumns(width, {
      hasInsight: options.hasInsight,
      docked: options.enabled && width >= WORKBENCH_DOCK_BREAKPOINT,
    });
    node.style.setProperty('--workbench-rail', `${solved.work}px`);
    node.style.setProperty(
      '--workbench-insight',
      solved.insightDocked ? `${solved.insight}px` : '0px',
    );
    node.dataset.workbenchDocked = solved.insightDocked ? 'true' : 'false';
  }, [options.enabled, options.hasInsight, width]);

  useEffect(() => () => { observerRef.current?.disconnect(); }, []);

  if (width === 0) {
    /*
     * Before the first measurement there is no honest answer, so the CSS
     * fallback from `agent-workspace-grid.css` decides. Returning zeros here
     * would collapse both tracks for one frame, and a layout that jumps on
     * load is worse than a layout that resolves a frame late.
     */
    return {
      work: WORK_RAIL_WIDTH,
      insight: INSIGHT_WIDTH,
      insightDocked: true,
      ref,
    };
  }

  return {
    ...workspaceColumns(width, {
      hasInsight: options.hasInsight,
      docked: options.enabled && width >= WORKBENCH_DOCK_BREAKPOINT,
    }),
    ref,
  };
}
