import { describe, expect, it } from 'vitest';
import { DEFAULT_IDLE_PAUSE_SECONDS, parseIdlePauseMs } from './idlePause';

describe('parseIdlePauseMs (D4 idle pause setting)', () => {
  it('defaults to 5 seconds (D4)', () => {
    expect(DEFAULT_IDLE_PAUSE_SECONDS).toBe(5);
    expect(parseIdlePauseMs(undefined)).toBe(5000);
  });

  it.each([
    ['1', 1000],
    ['3', 3000],
    [' 60 ', 60_000],
  ])('reads whole seconds in range: %s', (raw, expected) => {
    expect(parseIdlePauseMs(raw)).toBe(expected);
  });

  it.each([
    ['empty text', ''],
    ['a word', 'fast'],
    ['a fraction', '2.5'],
    ['a negative number', '-3'],
    ['zero', '0'],
    ['above the maximum', '61'],
  ])('falls back to the default for %s', (_label, raw) => {
    expect(parseIdlePauseMs(raw)).toBe(5000);
  });
});
