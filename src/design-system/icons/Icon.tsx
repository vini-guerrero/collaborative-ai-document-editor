import type { JSX } from 'react';
import {
  ArrowLeft,
  Archive,
  Bold,
  Bot,
  BotOff,
  BotCheck,
  Check,
  Code,
  CodeXml,
  Eye,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  History,
  Italic,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Link,
  List,
  ListOrdered,
  Minus,
  Moon,
  Menu,
  Pin,
  Plus,
  Quote,
  Redo,
  Search,
  Sparkles,
  SquareCode,
  Strikethrough,
  Sun,
  Trash,
  Undo,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

// Icons come from Lucide only, through this wrapper (S6, S8). Lucide's Trash2 is an alias
// of Trash, so the canonical name is used.
const ICONS = {
  'arrow-left': ArrowLeft,
  archive: Archive,
  bold: Bold,
  bot: Bot,
  'bot-check': BotCheck,
  'bot-off': BotOff,
  check: Check,
  code: Code,
  'code-block': CodeXml,
  eye: Eye,
  'file-text': FileText,
  'heading-1': Heading1,
  'heading-2': Heading2,
  'heading-3': Heading3,
  history: History,
  italic: Italic,
  'layout-grid': LayoutGrid,
  maximize: Maximize2,
  minimize: Minimize2,
  link: Link,
  list: List,
  'list-ordered': ListOrdered,
  menu: Menu,
  minus: Minus,
  moon: Moon,
  pin: Pin,
  plus: Plus,
  quote: Quote,
  redo: Redo,
  search: Search,
  sparkles: Sparkles,
  'square-code': SquareCode,
  strikethrough: Strikethrough,
  sun: Sun,
  trash: Trash,
  undo: Undo,
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
