import type { IconName } from '@/design-system';

// D12: the four actions the slash menu offers.
export const SLASH_ITEM_IDS = [
  'rewrite-paragraph',
  'change-tone',
  'ask-missing',
  'restructure-section',
] as const;

export type SlashItemId = (typeof SLASH_ITEM_IDS)[number];

export interface SlashItem {
  readonly id: SlashItemId;
  readonly label: string;
  readonly description?: string;
  readonly icon: IconName;
  // True while the action is not built yet: shown with a "Soon" label and never run (H2, H3).
  readonly soon?: boolean;
}

export const SLASH_ITEMS: readonly SlashItem[] = [
  {
    id: 'rewrite-paragraph',
    label: 'Rewrite paragraph',
    description: 'Rewrite the paragraph above',
    icon: 'file-text',
  },
  { id: 'change-tone', label: 'Change tone', icon: 'users' },
  { id: 'ask-missing', label: "Ask what's missing", icon: 'search', soon: true },
  {
    id: 'restructure-section',
    label: 'Restructure section',
    description: 'Move, split or merge',
    icon: 'layout-grid',
  },
];

// Case-insensitive match on the label. An empty query keeps every item.
export function filterSlashItems(items: readonly SlashItem[], query: string): readonly SlashItem[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return items;
  }
  return items.filter((item) => item.label.toLowerCase().includes(needle));
}

// Stable DOM id for an option, so the editor can point aria-activedescendant at it.
export function slashOptionDomId(id: SlashItemId): string {
  return `slash-option-${id}`;
}
