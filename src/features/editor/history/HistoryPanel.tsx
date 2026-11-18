import type { JSX } from 'react';
import { BottomSheet } from '@/design-system';
import type { HistoryEntry } from '@/features/documents';
import { HistoryTimeline } from './HistoryTimeline';

export interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
  // Oldest first, as stored.
  entries: readonly HistoryEntry[];
  now: number;
  onRestore: (entryId: string) => void;
}

// D7: the version history. A bottom sheet at every width, so touch and keyboard share one path.
// This is a deliberate deviation from the popover used for flags (S9): the timeline is long.
export function HistoryPanel({
  open,
  onClose,
  entries,
  now,
  onRestore,
}: HistoryPanelProps): JSX.Element {
  return (
    <BottomSheet open={open} onClose={onClose} label="Version history">
      {open ? <HistoryTimeline entries={entries} now={now} onRestore={onRestore} /> : null}
    </BottomSheet>
  );
}
