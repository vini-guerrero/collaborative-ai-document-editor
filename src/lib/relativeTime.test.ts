import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './relativeTime';

const NOW_MS = Date.parse('2026-11-17T12:00:00Z');
const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

const ago = (elapsedMs: number): string => formatRelativeTime(NOW_MS - elapsedMs, NOW_MS, 'en');

// H4: "Edited x ago" uses the largest whole unit, rounded toward zero.
describe('formatRelativeTime (H4)', () => {
  it('reads anything under 5 seconds as now', () => {
    expect(ago(0)).toBe('now');
    expect(ago(4 * SECOND_MS)).toBe('now');
  });

  it('uses seconds from 5 seconds up to just under a minute', () => {
    expect(ago(5 * SECOND_MS)).toBe('5 seconds ago');
    expect(ago(59 * SECOND_MS)).toBe('59 seconds ago');
  });

  it('switches from seconds to minutes at exactly 60 seconds', () => {
    expect(ago(60 * SECOND_MS)).toBe('1 minute ago');
    expect(ago(90 * SECOND_MS)).toBe('1 minute ago');
  });

  it('rounds minutes toward zero', () => {
    expect(ago(45 * MINUTE_MS)).toBe('45 minutes ago');
  });

  it('formats hours', () => {
    expect(ago(3 * HOUR_MS)).toBe('3 hours ago');
  });

  it('formats days', () => {
    expect(ago(2 * DAY_MS)).toBe('2 days ago');
  });

  it('formats weeks', () => {
    expect(ago(3 * WEEK_MS)).toBe('3 weeks ago');
  });

  it('formats months', () => {
    expect(ago(5 * MONTH_MS)).toBe('5 months ago');
  });

  it('formats years', () => {
    expect(ago(2 * YEAR_MS)).toBe('2 years ago');
  });

  it('treats a future timestamp (clock skew) as now', () => {
    expect(formatRelativeTime(NOW_MS + 10 * MINUTE_MS, NOW_MS, 'en')).toBe('now');
  });

  it('uses the runtime default locale when none is given', () => {
    expect(formatRelativeTime(NOW_MS - 3 * HOUR_MS, NOW_MS)).toBe(
      new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-3, 'hour'),
    );
  });
});
