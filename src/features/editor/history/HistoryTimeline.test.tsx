import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { HistoryEntry } from '@/features/documents';
import { HISTORY_PREVIEW_COUNT, HistoryTimeline } from './HistoryTimeline';
import { aiAcceptEntry, youCheckpointEntry } from './historyActions';

const NOW = 1_700_000_000_000;
const MINUTE_MS = 60_000;

function entryAt(minutesAgo: number, id: string, label: string): HistoryEntry {
  return aiAcceptEntry({ id, markdown: `Text ${id}`, label, now: NOW - minutesAgo * MINUTE_MS });
}

// Oldest first, as the store keeps them.
const ENTRIES: HistoryEntry[] = [
  entryAt(30, 'e1', 'Clarity: first'),
  youCheckpointEntry({ id: 'e2', markdown: 'Typed', now: NOW - 20 * MINUTE_MS }),
  entryAt(2, 'e3', 'Tone: newest'),
];

// Each restore button is named "Restore this version: <entry label>", so the names give the order.
function restoreNames(): string[] {
  return screen
    .getAllByRole('button', { name: /^Restore this version: / })
    .map((button) => button.getAttribute('aria-label') ?? '');
}

describe('HistoryTimeline', () => {
  it('lists entries newest first with author and relative time', () => {
    render(<HistoryTimeline entries={ENTRIES} now={NOW} onRestore={vi.fn()} />);
    expect(restoreNames()).toEqual([
      'Restore this version: Tone: newest',
      'Restore this version: Checkpoint',
      'Restore this version: Clarity: first',
    ]);
    expect(screen.getByText('AI · 2 minutes ago')).toBeTruthy();
    expect(screen.getByText('You · 20 minutes ago')).toBeTruthy();
  });

  it('falls back to a label chosen by author when the entry has none', () => {
    const unlabeledAi: HistoryEntry = { id: 'u1', author: 'ai', markdown: 'x', createdAt: NOW };
    render(<HistoryTimeline entries={[unlabeledAi]} now={NOW} onRestore={vi.fn()} />);
    expect(screen.getByText('AI suggestion')).toBeTruthy();
  });

  it('calls onRestore with the id of the entry whose button was pressed', async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    render(<HistoryTimeline entries={ENTRIES} now={NOW} onRestore={onRestore} />);
    await user.click(screen.getByRole('button', { name: 'Restore this version: Clarity: first' }));
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore).toHaveBeenCalledWith('e1');
  });

  it('shows the empty state when there are no entries', () => {
    render(<HistoryTimeline entries={[]} now={NOW} onRestore={vi.fn()} />);
    expect(screen.getByText('No earlier versions yet')).toBeTruthy();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('shows the newest entries only until "Show All" is pressed', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: HISTORY_PREVIEW_COUNT + 10 }, (_, index) =>
      entryAt(index + 1, `m${String(index)}`, `Clarity: ${String(index)}`),
    ).reverse();
    render(<HistoryTimeline entries={many} now={NOW} onRestore={vi.fn()} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(HISTORY_PREVIEW_COUNT);
    await user.click(screen.getByRole('button', { name: 'Show All' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(HISTORY_PREVIEW_COUNT + 10);
    expect(screen.queryByRole('button', { name: 'Show All' })).toBeNull();
  });

  it('collapses and expands with a disclosure button that reports aria-expanded', async () => {
    const user = userEvent.setup();
    render(<HistoryTimeline entries={ENTRIES} now={NOW} onRestore={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: 'History' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('listitem')).toHaveLength(ENTRIES.length);
  });
});
