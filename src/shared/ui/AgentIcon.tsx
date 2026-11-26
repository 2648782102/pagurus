import {
  ArrowUp,
  CircleStop,
  Cpu,
  PlugZap,
  Search,
  Settings2,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * The product surface's icons, from the same family as the console's.
 *
 * The surface used typographic characters for these — `↑` for send, `✕` for
 * close — which is the same problem the workspace rail had: a character is
 * whatever the reader's font decides, so its weight does not match the text
 * beside it and its metrics shift between platforms. Only two of the four
 * surfaces had been converted; the rest still drew glyphs.
 *
 * Imported by name, so the bundle carries only these three.
 *
 * There is no attach icon: the Runtime has no attachment field, and an icon
 * that opens nothing is worse than no icon.
 */
const ICONS = {
  send: ArrowUp,
  stop: CircleStop,
  close: X,
  search: Search,
  agent: Cpu,
  model: Settings2,
  extensions: PlugZap,
} as const satisfies Record<string, LucideIcon>;

export type AgentIconName = keyof typeof ICONS;

export function AgentIcon({
  name,
  size = 16,
}: {
  readonly name: AgentIconName;
  readonly size?: number;
}) {
  const Icon = ICONS[name];
  /* 1.75 matches the console's rail: one stroke weight across both surfaces. */
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}
