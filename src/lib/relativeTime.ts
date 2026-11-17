const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MS_PER_MONTH = 30 * MS_PER_DAY;
const MS_PER_YEAR = 365 * MS_PER_DAY;
// Anything younger than this reads as "now" (H4).
const JUST_NOW_THRESHOLD_MS = 5 * MS_PER_SECOND;

interface UnitSpec {
  readonly unit: Intl.RelativeTimeFormatUnit;
  readonly ms: number;
}

// Largest first: the first unit with at least one whole step wins.
const UNITS: readonly UnitSpec[] = [
  { unit: 'year', ms: MS_PER_YEAR },
  { unit: 'month', ms: MS_PER_MONTH },
  { unit: 'week', ms: MS_PER_WEEK },
  { unit: 'day', ms: MS_PER_DAY },
  { unit: 'hour', ms: MS_PER_HOUR },
  { unit: 'minute', ms: MS_PER_MINUTE },
  { unit: 'second', ms: MS_PER_SECOND },
];

/**
 * Formats how long ago `timestampMs` was relative to `nowMs` (H4, "Edited x ago").
 * Timestamps in the future (clock skew) and anything under 5 seconds read as "now".
 * `nowMs` is a parameter so the function stays pure; callers inject the clock.
 */
export function formatRelativeTime(timestampMs: number, nowMs: number, locale?: string): string {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const elapsedMs = Math.max(0, nowMs - timestampMs);
  if (elapsedMs < JUST_NOW_THRESHOLD_MS) {
    return formatter.format(0, 'second');
  }
  const spec = UNITS.find(({ ms }) => elapsedMs >= ms);
  if (spec === undefined) {
    return formatter.format(0, 'second');
  }
  const count = Math.floor(elapsedMs / spec.ms);
  return formatter.format(-count, spec.unit);
}
