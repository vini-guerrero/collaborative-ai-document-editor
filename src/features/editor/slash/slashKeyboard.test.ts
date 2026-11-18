import { describe, expect, it } from 'vitest';
import { slashKeyOutcome } from './slashKeyboard';

// D12: arrows move with wrap-around, Enter chooses, Escape dismisses, other keys are left alone.
describe('slashKeyOutcome', () => {
  it('moves down and wraps to the first item', () => {
    expect(slashKeyOutcome('ArrowDown', 0, 4)).toEqual({ type: 'move', index: 1 });
    expect(slashKeyOutcome('ArrowDown', 3, 4)).toEqual({ type: 'move', index: 0 });
  });

  it('moves up and wraps to the last item', () => {
    expect(slashKeyOutcome('ArrowUp', 2, 4)).toEqual({ type: 'move', index: 1 });
    expect(slashKeyOutcome('ArrowUp', 0, 4)).toEqual({ type: 'move', index: 3 });
  });

  it('chooses on Enter and dismisses on Escape', () => {
    expect(slashKeyOutcome('Enter', 1, 4)).toEqual({ type: 'choose' });
    expect(slashKeyOutcome('Escape', 1, 4)).toEqual({ type: 'dismiss' });
  });

  it('ignores every key when the list is empty, except Escape', () => {
    expect(slashKeyOutcome('ArrowDown', 0, 0)).toEqual({ type: 'ignore' });
    expect(slashKeyOutcome('Enter', 0, 0)).toEqual({ type: 'ignore' });
    expect(slashKeyOutcome('Escape', 0, 0)).toEqual({ type: 'dismiss' });
  });

  it('ignores other keys', () => {
    expect(slashKeyOutcome('a', 0, 4)).toEqual({ type: 'ignore' });
  });
});
