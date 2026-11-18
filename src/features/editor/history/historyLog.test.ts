import { describe, expect, it } from 'vitest';
import { IDLE_CHECKPOINT_MS, type HistoryEntry } from '@/features/documents';
import { withAiAccept, withCheckpoint, withSnapshot } from './historyLog';

const EARLIER: HistoryEntry = { id: 'a', author: 'user', markdown: 'old', createdAt: 1 };

describe('withCheckpoint (D7)', () => {
  // D7: an idle save of changed text adds a "You" checkpoint.
  it('adds a checkpoint after the idle time when the text changed', () => {
    const next = withCheckpoint([EARLIER], 'new', 0, IDLE_CHECKPOINT_MS, 'b');
    expect(next).toHaveLength(2);
    expect(next[1]?.author).toBe('user');
    expect(next[1]?.markdown).toBe('new');
  });

  // D7: a save within the idle time, or of unchanged text, adds nothing.
  it('adds nothing for a quick save or unchanged text', () => {
    expect(withCheckpoint([EARLIER], 'new', 0, 1000, 'b')).toHaveLength(1);
    expect(withCheckpoint([EARLIER], 'old', 0, IDLE_CHECKPOINT_MS * 2, 'b')).toHaveLength(1);
  });
});

describe('withAiAccept (D7)', () => {
  // D7: an accepted suggestion is an AI entry with its label.
  it('records the AI author and label', () => {
    const next = withAiAccept([], { id: 'c', markdown: 'text', label: 'Clarity', now: 5 });
    expect(next).toEqual([
      { id: 'c', author: 'ai', markdown: 'text', createdAt: 5, label: 'Clarity' },
    ]);
  });
});

describe('withSnapshot (D7)', () => {
  // D7: the author's text before an AI change is kept as a "You" entry when it is new.
  it('keeps the text before the change when it is not the newest entry', () => {
    const next = withSnapshot([EARLIER], 'before change', 7, 'c');
    expect(next.map((entry) => entry.markdown)).toEqual(['old', 'before change']);
    expect(next[1]?.author).toBe('user');
  });

  // D7: nothing is added when the newest entry already holds that text.
  it('adds nothing when the newest entry has the same text', () => {
    expect(withSnapshot([EARLIER], 'old', 7, 'c')).toHaveLength(1);
  });
});
