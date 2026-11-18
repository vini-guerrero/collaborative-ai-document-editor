import { useId, useState, type JSX } from 'react';
import { Button } from '@/design-system';
import type { HistoryEntry } from '@/features/documents';
import { HistoryEntryRow } from './HistoryEntryRow';
import './HistoryTimeline.css';

// Long histories open with the newest entries only; "Show All" reveals the rest.
export const HISTORY_PREVIEW_COUNT = 50;

export interface HistoryTimelineProps {
  // Oldest first, as the history store keeps them (recordEntry appends).
  entries: readonly HistoryEntry[];
  now: number;
  onRestore: (entryId: string) => void;
}

// D7: the version history, shown as a collapsible disclosure. Open by default; the toggle is
// a button with aria-expanded, so it works with keyboard and touch and has no hover-only path.
export function HistoryTimeline({ entries, now, onRestore }: HistoryTimelineProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(true);
  const [isShowingAll, setIsShowingAll] = useState(false);
  const panelId = useId();
  const newestFirst = [...entries].reverse();
  const visible = isShowingAll ? newestFirst : newestFirst.slice(0, HISTORY_PREVIEW_COUNT);
  const hasMore = visible.length < newestFirst.length;

  return (
    <section className="history-timeline">
      <Button
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          setIsOpen((open) => !open);
        }}
      >
        History
      </Button>
      <div id={panelId} className="history-timeline__panel" hidden={!isOpen}>
        {entries.length === 0 ? (
          <p className="history-timeline__empty">No earlier versions yet</p>
        ) : (
          <ol className="history-timeline__list">
            {visible.map((entry) => (
              <HistoryEntryRow key={entry.id} entry={entry} now={now} onRestore={onRestore} />
            ))}
          </ol>
        )}
        {hasMore ? (
          <Button
            onClick={() => {
              setIsShowingAll(true);
            }}
          >
            Show All
          </Button>
        ) : null}
      </div>
    </section>
  );
}
