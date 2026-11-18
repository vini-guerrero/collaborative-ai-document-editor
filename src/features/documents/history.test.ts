import { describe, expect, it } from 'vitest';
import {
  HISTORY_MAX_MARKDOWN_UNITS,
  IDLE_CHECKPOINT_MS,
  recordEntry,
  restoreEntry,
  shouldCheckpoint,
} from './history';
import type { HistoryEntry, StoredDocument } from './schema';
import { HISTORY_MAX_ENTRIES } from './schema';

const entry = (id: string, markdown = 'x'): HistoryEntry => ({
  id,
  author: 'user',
  markdown,
  createdAt: 1,
});

const docWith = (history: HistoryEntry[]): Pick<StoredDocument, 'history'> => ({ history });

describe('recordEntry', () => {
  it('appends the entry after the existing ones (D7)', () => {
    expect(recordEntry([entry('a')], entry('b')).map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('drops the oldest entries beyond the count cap and keeps the newest (D7)', () => {
    const full = Array.from({ length: HISTORY_MAX_ENTRIES }, (_, index) =>
      entry(`h${String(index)}`),
    );

    const next = recordEntry(full, entry('newest'));

    expect(next).toHaveLength(HISTORY_MAX_ENTRIES);
    expect(next[0]?.id).toBe('h1');
    expect(next.at(-1)?.id).toBe('newest');
  });

  it('drops the oldest entries beyond the byte budget (D7)', () => {
    const chunk = 'x'.repeat(HISTORY_MAX_MARKDOWN_UNITS / 2);
    const history = [entry('a', chunk), entry('b', chunk)];

    const next = recordEntry(history, entry('c', chunk));

    expect(next.map((item) => item.id)).toEqual(['b', 'c']);
  });

  it('keeps the newest entry even when it alone exceeds the byte budget (D7)', () => {
    const huge = 'x'.repeat(HISTORY_MAX_MARKDOWN_UNITS + 1);

    expect(recordEntry([entry('a')], entry('big', huge)).map((item) => item.id)).toEqual(['big']);
  });
});

describe('restoreEntry', () => {
  it('returns the restored Markdown and appends a Restored entry (D17)', () => {
    const doc = docWith([entry('old', 'Old text'), entry('new', 'New text')]);

    const result = restoreEntry(doc, 'old', 500, 'restore-1');

    expect(result?.markdown).toBe('Old text');
    expect(result?.history.map((item) => item.id)).toEqual(['old', 'new', 'restore-1']);
    expect(result?.history.at(-1)).toEqual({
      id: 'restore-1',
      author: 'user',
      markdown: 'Old text',
      createdAt: 500,
      label: 'Restored',
    });
  });

  it('returns null for an unknown entry id', () => {
    expect(restoreEntry(docWith([entry('a')]), 'missing', 500, 'restore-1')).toBeNull();
  });
});

describe('shouldCheckpoint', () => {
  it('uses a one-minute idle threshold (D7)', () => {
    expect(IDLE_CHECKPOINT_MS).toBe(60_000);
  });

  it('is true after the idle time when the Markdown differs from the newest entry', () => {
    const input = {
      history: [entry('a', 'old')],
      markdown: 'new',
      lastSavedAt: 0,
      now: IDLE_CHECKPOINT_MS,
    };

    expect(shouldCheckpoint(input)).toBe(true);
  });

  it('is false before the idle time has passed', () => {
    const input = {
      history: [entry('a', 'old')],
      markdown: 'new',
      lastSavedAt: 0,
      now: IDLE_CHECKPOINT_MS - 1,
    };

    expect(shouldCheckpoint(input)).toBe(false);
  });

  it('is false when the Markdown equals the newest entry', () => {
    const input = {
      history: [entry('a', 'same')],
      markdown: 'same',
      lastSavedAt: 0,
      now: IDLE_CHECKPOINT_MS * 2,
    };

    expect(shouldCheckpoint(input)).toBe(false);
  });
});
