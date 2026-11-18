// Keys the slash menu uses while the editor keeps focus (D12). The editor is the focused element,
// so these arrive through the suggestion's keydown hook, not through the menu's own DOM.
export const SLASH_KEY = {
  next: 'ArrowDown',
  previous: 'ArrowUp',
  choose: 'Enter',
  dismiss: 'Escape',
} as const;

export type SlashKeyOutcome =
  | { readonly type: 'move'; readonly index: number }
  | { readonly type: 'choose' }
  | { readonly type: 'dismiss' }
  | { readonly type: 'ignore' };

const IGNORE: SlashKeyOutcome = { type: 'ignore' };

// Arrow keys wrap around the list. With no items there is nothing to move to or choose.
export function slashKeyOutcome(key: string, activeIndex: number, count: number): SlashKeyOutcome {
  if (key === SLASH_KEY.dismiss) {
    return { type: 'dismiss' };
  }
  if (count === 0) {
    return IGNORE;
  }
  const current = Math.min(Math.max(activeIndex, 0), count - 1);
  if (key === SLASH_KEY.next) {
    return { type: 'move', index: (current + 1) % count };
  }
  if (key === SLASH_KEY.previous) {
    return { type: 'move', index: (current - 1 + count) % count };
  }
  if (key === SLASH_KEY.choose) {
    return { type: 'choose' };
  }
  return IGNORE;
}
