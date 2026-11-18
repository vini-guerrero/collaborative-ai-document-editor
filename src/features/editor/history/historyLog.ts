import { recordEntry, shouldCheckpoint, type HistoryEntry } from '@/features/documents';
import { aiAcceptEntry, youCheckpointEntry } from './historyActions';

// D7: a new entry id. Randomness is read at this edge, not in the pure helpers below.
export function createEntryId(): string {
  return crypto.randomUUID();
}

// D7: an idle save may add a "You" checkpoint. The first save of a new document never does, because
// its lastSavedAt is the save itself. Returns a new list; the input is not changed.
export function withCheckpoint(
  history: readonly HistoryEntry[],
  markdown: string,
  lastSavedAt: number,
  now: number,
  id: string,
): HistoryEntry[] {
  if (!shouldCheckpoint({ history, markdown, lastSavedAt, now })) {
    return [...history];
  }
  return recordEntry(history, youCheckpointEntry({ id, markdown, now }));
}

// D7: an accepted suggestion or restructure is recorded as an AI entry.
export function withAiAccept(
  history: readonly HistoryEntry[],
  input: {
    readonly id: string;
    readonly markdown: string;
    readonly label: string;
    readonly now: number;
  },
): HistoryEntry[] {
  return recordEntry(history, aiAcceptEntry(input));
}
