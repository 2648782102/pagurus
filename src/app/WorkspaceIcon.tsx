import {
  Activity,
  MessageCircle,
  ClipboardList,
  FolderOpen,
  House,
  KeyRound,
  MessagesSquare,
  Settings,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { WorkspaceId } from './useWorkspace.js';

/**
 * One icon per workspace, from a single family.
 *
 * These used to be Unicode characters — `⌂ ◎ ✦ ✓ ◉ ↗ ≋ ⌘ ✳ ⚙` — which come from
 * four different Unicode blocks. Browsers pick a font per block, so at the same
 * 40px size they rendered between 24px and 40px wide and read as ten unrelated
 * marks rather than one navigation set.
 *
 * Lucide gives one grid (24×24), one stroke weight, and one corner radius, so
 * the set is consistent by construction. Icons are imported by name, so only the
 * ones used here are bundled.
 *
 * The set was chosen for even optical weight, not just meaning. Some Lucide
 * glyphs occupy far less of the 24×24 box than others — `Bot`, for instance,
 * reads visibly smaller beside `CheckCheck` at the same nominal size. Each entry
 * below is a glyph that fills a comparable area, so the column reads as one
 * rhythm rather than nine drawings that happen to be the same width.
 */
const ICONS: Readonly<Record<WorkspaceId, LucideIcon>> = Object.freeze({
  overview: House,
  organization: MessagesSquare,
  agentChat: MessageCircle,
  execution: Activity,
  agents: UserRound,
  tasks: ClipboardList,
  work: FolderOpen,
  capabilities: ShieldCheck,
  secrets: KeyRound,
  settings: Settings,
});

export function WorkspaceIcon({
  id,
  size = 16,
}: {
  readonly id: WorkspaceId;
  readonly size?: number;
}) {
  const Icon = ICONS[id];
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}
