import type { JSX } from 'react';
import {
  ArrowLeft,
  Archive,
  Check,
  FileText,
  LayoutGrid,
  List,
  Menu,
  Pin,
  Plus,
  Search,
  Trash,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

// Icons come from Lucide only, through this wrapper (S6, S8). Lucide's Trash2 is an alias
// of Trash, so the canonical name is used.
const ICONS = {
  'arrow-left': ArrowLeft,
  archive: Archive,
  check: Check,
  'file-text': FileText,
  'layout-grid': LayoutGrid,
  list: List,
  menu: Menu,
  pin: Pin,
  plus: Plus,
  search: Search,
  trash: Trash,
  users: Users,
  x: X,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

const DEFAULT_ICON_SIZE_PX = 20;

export interface IconProps {
  name: IconName;
  // Without a label the icon is decorative and hidden from assistive technology.
  label?: string;
  size?: number;
}

// Stroke is Lucide's default currentColor, so the icon takes the text color around it.
export function Icon({ name, label, size = DEFAULT_ICON_SIZE_PX }: IconProps): JSX.Element {
  const Component = ICONS[name];
  if (label === undefined) {
    return <Component size={size} aria-hidden="true" />;
  }
  return <Component size={size} role="img" aria-label={label} />;
}
