import type { JSX } from 'react';
import { Button } from '@/design-system';
import { formatRelativeTime } from '@/lib/relativeTime';
import type { HistoryEntry } from '@/features/documents';
import { AUTHOR_NAMES, entryDisplayLabel } from './historyLabels';
import './HistoryEntryRow.css';

export interface HistoryEntryRowProps {
  entry: HistoryEntry;
  now: number;
  onRestore: (entryId: string) => void;
}

// One timeline item. The author is written as text, so AI entries never rely on colour alone (S7).
// The restore button names the entry in its accessible name, so repeated buttons stay distinct.
export function HistoryEntryRow({ entry, now, onRestore }: HistoryEntryRowProps): JSX.Element {
  const label = entryDisplayLabel(entry);
  return (
    <li className={`history-entry history-entry--${entry.author}`}>
      <div className="history-entry__body">
        <p className="history-entry__label">{label}</p>
        <p className="history-entry__meta">
          {`${AUTHOR_NAMES[entry.author]} · ${formatRelativeTime(entry.createdAt, now)}`}
        </p>
      </div>
      <Button
        onClick={() => {
          onRestore(entry.id);
        }}
        aria-label={`Restore this version: ${label}`}
      >
        Restore
      </Button>
    </li>
  );
}
