// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { computeColumns, CENTER_MIN, SIDEBAR_MIN, SIDEBAR_MAX } from '../src/dsh/layout/columns.js';
import {
  INSIGHT_WIDTH,
  WORK_RAIL_WIDTH,
  workspaceColumns,
} from '../src/agent/useWorkspaceColumns.js';

/**
 * DSH's column solver: the right column shrinks, then loses its track, before
 * the centre drops below its minimum. The sidebar never concedes.
 */
describe('DSH column geometry', () => {
  it('keeps the centre at or above its minimum while a right track can be dropped', () => {
    for (const viewport of [900, 1024, 1280, 1440, 1920, 2560]) {
      const solved = computeColumns(viewport, WORK_RAIL_WIDTH, INSIGHT_WIDTH);
      expect(solved.sidebar).toBe(WORK_RAIL_WIDTH);
      expect(solved.center).toBeGreaterThanOrEqual(CENTER_MIN);
      const tracks = solved.sidebar + solved.center + solved.rightbar;
      expect(tracks).toBeLessThanOrEqual(viewport);
    }
  });

  it('drops the right track rather than squeezing the centre below 400px', () => {
    // 900 - 320 sidebar - 400 centre = 180, below a 300px right panel.
    const narrow = computeColumns(900, WORK_RAIL_WIDTH, INSIGHT_WIDTH);
    expect(narrow.rightbar).toBe(0);
    expect(narrow.center).toBe(580);

    const wide = computeColumns(1920, WORK_RAIL_WIDTH, INSIGHT_WIDTH);
    expect(wide.rightbar).toBe(INSIGHT_WIDTH);
    expect(wide.center).toBe(1920 - WORK_RAIL_WIDTH - INSIGHT_WIDTH);
  });

  it('clamps the sidebar within DSH range and never lets it collapse to nothing', () => {
    expect(computeColumns(1920, 100, 0).sidebar).toBe(SIDEBAR_MIN);
    expect(computeColumns(1920, 9999, 0).sidebar).toBe(SIDEBAR_MAX);
    // `0` means "collapsed", which keeps DSH's icon rail rather than hiding it.
    expect(computeColumns(1920, 0, 0).sidebar).toBe(56);
  });

  it('turns both side tracks off below the dock breakpoint', () => {
    expect(workspaceColumns(1280, { hasInsight: true, docked: false }))
      .toEqual({ work: 0, insight: 0, insightDocked: false });
  });

  it('reports an overlay when the solver removes the insight track', () => {
    const columns = workspaceColumns(1000, { hasInsight: true, docked: true });
    expect(columns.work).toBe(WORK_RAIL_WIDTH);
    expect(columns.insightDocked).toBe(false);
  });
});
