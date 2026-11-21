/**
 * How a published reasoning level reads in Chinese.
 *
 * Only the levels with a natural word are translated. Everything else —
 * `xhigh`, `max`, `ultra`, and whatever the gateway adds next — is shown as the
 * token the gateway uses, because a wrong translation is worse than a literal
 * one: a reader shown "极深" cannot tell whether that is stronger than "深入",
 * and the gateway's own ordering is the only authority on the steps.
 *
 * Shared rather than owned by one component: the header, the context panel, and
 * the composer all print the same level, and three copies of this table drift.
 */
const EFFORT_LABELS: Readonly<Record<string, string>> = {
  none: '不思考',
  low: '快速',
  medium: '均衡',
  high: '深入',
  xhigh: '极深',
  max: '最强',
  ultra: '极限',
};

export function effortLabel(effort: string): string {
  return EFFORT_LABELS[effort] ?? effort;
}

/**
 * One line of prose for a step, used where a bare word is not enough.
 *
 * A menu that lists six one-word choices tells a reader nothing about what
 * changes between them. The worked examples are the ones the product actually
 * shows: faster answers, or more thought before one.
 */
export function effortHint(effort: string): string | null {
  switch (effort) {
    case 'none': return '不进行额外推理';
    case 'low': return '更快，适合简单问题';
    case 'medium': return '速度与深度兼顾';
    case 'high': return '更深入，适合复杂问题';
    case 'xhigh': return '额外推理，明显更慢';
    case 'max': return '最大推理量，最慢';
    case 'ultra': return '超出常规上限的推理量';
    default: return null;
  }
}

/**
 * A short glyph for a step, so a menu can be scanned at a glance.
 *
 * Counted rather than semantic: the gateway's ordering is the one thing that is
 * always true, and an arbitrary icon per level would imply a difference in kind
 * where there is only a difference in amount.
 */
export function effortMeter(effort: string, levels: readonly string[]): number {
  const index = levels.indexOf(effort);
  if (index === -1 || levels.length === 0) return 0;
  return index + 1;
}
