import { HISTORY_MAX_ENTRIES, type HistoryEntry, type StoredDocument } from './schema';

// D7: a budget on stored Markdown as well as the entry count. Counted in UTF-16 code units
// (String.length), which is cheap to sum and close to bytes for mostly ASCII text.
export const HISTORY_MAX_MARKDOWN_UNITS = 500_000;

// D7: a "You" checkpoint is taken on a save that follows at least this much idle time.
export const IDLE_CHECKPOINT_MS = 60_000;

export const RESTORED_LABEL = 'Restored';

export interface RestoreResult {
  markdown: string;
  history: HistoryEntry[];
}

export interface CheckpointInput {
  history: readonly HistoryEntry[];
  markdown: string;
  lastSavedAt: number;
  now: number;
}

// Appends `entry`, then drops the oldest entries while either cap is exceeded. The newest entry
// is never dropped, even when it alone is over the byte budget.
export function recordEntry(history: readonly HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const all = [...history, entry];
  let units = all.reduce((sum, item) => sum + item.markdown.length, 0);
  let start = 0;
  while (
    start < all.length - 1 &&
    (all.length - start > HISTORY_MAX_ENTRIES || units > HISTORY_MAX_MARKDOWN_UNITS)
  ) {
    units -= all[start]?.markdown.length ?? 0;
    start += 1;
  }
  return all.slice(start);
}

// Restores the Markdown of entry `entryId`. The restore is itself recorded as a new entry, so
// the timeline keeps the restored state. Returns null when no entry has that id.
export function restoreEntry(
  doc: Pick<StoredDocument, 'history'>,
  entryId: string,
  now: number,
  newId: string,
): RestoreResult | null {
  const target = doc.history.find((entry) => entry.id === entryId);
  if (target === undefined) return null;
  const restored: HistoryEntry = {
    id: newId,
    author: 'user',
    markdown: target.markdown,
    createdAt: now,
    label: RESTORED_LABEL,
  };
  return {
    markdown: target.markdown,
    history: recordEntry(doc.history, restored),
  };
}

// True when an idle save should add a "You" checkpoint: enough time passed since the last save,
// and the Markdown differs from the newest entry (no duplicate checkpoints).
export function shouldCheckpoint(input: CheckpointInput, idleMs = IDLE_CHECKPOINT_MS): boolean {
  const latest = input.history[input.history.length - 1];
  if (latest?.markdown === input.markdown) return false;
  return input.now - input.lastSavedAt >= idleMs;
}
