import { describe, expect, it } from 'vitest';
import { HISTORY_LABEL_MAX_CHARS } from '@/features/documents';
import { aiAcceptEntry, trimLabel, youCheckpointEntry } from './historyActions';

// D7: entries built by the helpers must parse against the schema the store uses.
describe('trimLabel', () => {
  it('trims surrounding whitespace', () => {
    expect(trimLabel('  Clarity: moved  ')).toBe('Clarity: moved');
  });

  it('caps the label at the schema limit in UTF-16 units', () => {
    const trimmed = trimLabel('a'.repeat(HISTORY_LABEL_MAX_CHARS + 20));
    expect(trimmed).toHaveLength(HISTORY_LABEL_MAX_CHARS);
  });

  it('never splits an emoji and stays within the limit', () => {
    const trimmed = trimLabel('😀'.repeat(HISTORY_LABEL_MAX_CHARS));
    expect(trimmed.length).toBeLessThanOrEqual(HISTORY_LABEL_MAX_CHARS);
    expect(trimmed).toBe('😀'.repeat(HISTORY_LABEL_MAX_CHARS / 2));
  });

  it('keeps non-ASCII text intact', () => {
    expect(trimLabel('  Tono: «señora» 東京  ')).toBe('Tono: «señora» 東京');
  });

  it('returns an empty string for a blank label', () => {
    expect(trimLabel('   ')).toBe('');
  });
});

describe('aiAcceptEntry', () => {
  it('records the AI author with the given markdown and time', () => {
    const entry = aiAcceptEntry({
      id: 'e1',
      markdown: 'Moved.',
      label: 'Clarity: moved',
      now: 1_700_000_000_000,
    });
    expect(entry).toEqual({
      id: 'e1',
      author: 'ai',
      markdown: 'Moved.',
      createdAt: 1_700_000_000_000,
      label: 'Clarity: moved',
    });
  });

  it('trims a long label to the schema limit', () => {
    const entry = aiAcceptEntry({
      id: 'e2',
      markdown: 'x',
      label: `Clarity: ${'long quote '.repeat(20)}`,
      now: 1,
    });
    expect(entry.label?.length).toBeLessThanOrEqual(HISTORY_LABEL_MAX_CHARS);
  });

  it('leaves the label out when it is blank', () => {
    const entry = aiAcceptEntry({ id: 'e3', markdown: 'x', label: '  ', now: 1 });
    expect(entry).not.toHaveProperty('label');
  });
});

describe('youCheckpointEntry', () => {
  it('records the user author with no label', () => {
    const entry = youCheckpointEntry({ id: 'c1', markdown: 'Draft', now: 5 });
    expect(entry).toEqual({ id: 'c1', author: 'user', markdown: 'Draft', createdAt: 5 });
    expect(entry).not.toHaveProperty('label');
  });
});
