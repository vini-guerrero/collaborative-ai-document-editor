import type { HistoryEntry } from '@/features/documents';

// D7: entries saved without a label still need a readable name in the timeline.
export const AI_ENTRY_FALLBACK_LABEL = 'AI suggestion';
export const CHECKPOINT_ENTRY_FALLBACK_LABEL = 'Checkpoint';

// D7: "AI" and "You" are the two authors the timeline shows (schema author values: ai, user).
export const AUTHOR_NAMES: Record<HistoryEntry['author'], string> = {
  ai: 'AI',
  user: 'You',
};

// The stored label when there is one, otherwise a fallback chosen by author.
export function entryDisplayLabel(entry: HistoryEntry): string {
  if (entry.label !== undefined && entry.label.length > 0) {
    return entry.label;
  }
  return entry.author === 'ai' ? AI_ENTRY_FALLBACK_LABEL : CHECKPOINT_ENTRY_FALLBACK_LABEL;
}
