// Keyboard model shared by Menu and Select (S9, D17). Pure functions over an index, so the
// movement rules can be read apart from the DOM. Components keep the active index in state.

export interface ListEntry {
  readonly label: string;
  readonly disabled?: boolean;
}

export interface ListKeyEvent {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
}

export const LIST_KEY = {
  arrowDown: 'ArrowDown',
  arrowUp: 'ArrowUp',
  home: 'Home',
  end: 'End',
  enter: 'Enter',
  space: ' ',
  tab: 'Tab',
} as const;

// S9: the type-ahead query is forgotten after this long without a keypress.
export const TYPEAHEAD_RESET_MS = 500;

const NO_INDEX = -1;

// Disabled entries are kept visible (H2, H3) but never receive the active index.
function isEnabled(entry: ListEntry | undefined): entry is ListEntry {
  return entry !== undefined && entry.disabled !== true;
}

export function firstEnabledIndex(entries: readonly ListEntry[]): number {
  return entries.findIndex((entry) => entry.disabled !== true);
}

export function lastEnabledIndex(entries: readonly ListEntry[]): number {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (isEnabled(entries[index])) {
      return index;
    }
  }
  return NO_INDEX;
}

// One enabled entry forward (1) or back (-1). Wraps at the ends and skips disabled entries.
export function stepEnabledIndex(
  entries: readonly ListEntry[],
  activeIndex: number,
  step: 1 | -1,
): number {
  const count = entries.length;
  for (let offset = 1; offset <= count; offset += 1) {
    const index = (((activeIndex + step * offset) % count) + count) % count;
    if (isEnabled(entries[index])) {
      return index;
    }
  }
  return NO_INDEX;
}

// The index a navigation key moves to, or undefined when the key is not a navigation key.
export function navigationTarget(
  entries: readonly ListEntry[],
  activeIndex: number,
  key: string,
): number | undefined {
  switch (key) {
    case LIST_KEY.arrowDown:
      return stepEnabledIndex(entries, activeIndex, 1);
    case LIST_KEY.arrowUp:
      return stepEnabledIndex(entries, activeIndex, -1);
    case LIST_KEY.home:
      return firstEnabledIndex(entries);
    case LIST_KEY.end:
      return lastEnabledIndex(entries);
    default:
      return undefined;
  }
}

// Space selects, so it never starts a search. Modified letters are shortcuts, not search text.
export function isTypeaheadKey(event: ListKeyEvent): boolean {
  return (
    event.key.length === 1 &&
    event.key !== LIST_KEY.space &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  );
}

// The first enabled entry whose label starts with the query, case-insensitively. A query made of
// one repeated letter cycles: it starts after the active entry, so pressing "b" again moves on.
export function typeaheadTarget(
  entries: readonly ListEntry[],
  query: string,
  activeIndex: number,
): number | undefined {
  const count = entries.length;
  if (count === 0 || query.length === 0) {
    return undefined;
  }
  const isRepeatedLetter = query === query.charAt(0).repeat(query.length);
  const needle = (isRepeatedLetter ? query.charAt(0) : query).toLocaleLowerCase();
  const start = isRepeatedLetter ? activeIndex + 1 : Math.max(activeIndex, 0);
  for (let offset = 0; offset < count; offset += 1) {
    const index = (start + offset) % count;
    const entry = entries[index];
    if (isEnabled(entry) && entry.label.toLocaleLowerCase().startsWith(needle)) {
      return index;
    }
  }
  return undefined;
}

const TAB_STOP_SELECTOR = 'a[href], button, input, select, textarea, [tabindex]';

// Where Tab goes when a list closes on it: the next (or previous) control outside the popover
// panel, so keyboard users carry on from the trigger. Null when there is none to move to.
export function findTabStop(
  trigger: HTMLElement,
  panel: Element | null,
  backward: boolean,
): HTMLElement | null {
  const stops = Array.from(document.querySelectorAll<HTMLElement>(TAB_STOP_SELECTOR)).filter(
    (element) =>
      element.tabIndex >= 0 && !element.matches(':disabled') && panel?.contains(element) !== true,
  );
  const index = stops.indexOf(trigger);
  if (index === NO_INDEX) {
    return null;
  }
  return stops.at(backward ? index - 1 : index + 1) ?? null;
}
