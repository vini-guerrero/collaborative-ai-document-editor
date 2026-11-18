import { describe, expect, it } from 'vitest';
import { MAX_INSTRUCTION_CHARS } from '@shared/schemas/text';
import {
  canStepBack,
  canStepForward,
  displayedText,
  instructionBudget,
  initialRefineState,
  refineReducer,
  requestFor,
  roundLabel,
  type RefineState,
} from './refineReducer';

// D6: rounds, accumulated instructions, step-back n/m, diff against the original.
const ORIGINAL = 'We have made the decision to restructure the rotation.';

function started(): RefineState {
  return initialRefineState(ORIGINAL);
}

function withRounds(state: RefineState, replacements: readonly string[]): RefineState {
  return replacements.reduce(
    (current, replacement) =>
      refineReducer(refineReducer(current, { type: 'setTone', tone: 'formal' }), {
        type: 'roundReceived',
        replacement,
      }),
    state,
  );
}

describe('refineReducer start', () => {
  it('starts with the original text, default tone and length, and no rounds', () => {
    const state = started();
    expect(state).toEqual({
      original: ORIGINAL,
      tone: 'auto',
      length: 'same',
      instructions: [],
      rounds: [],
      index: 0,
    });
    expect(roundLabel(state)).toBe('');
    expect(displayedText(state)).toBe(ORIGINAL);
  });
});

describe('refineReducer rounds', () => {
  it('starts a pending round for each tone pick, built from the current settings', () => {
    const state = refineReducer(started(), { type: 'setTone', tone: 'casual' });
    expect(state.rounds).toEqual([
      { tone: 'casual', length: 'same', instructions: '', replacement: null },
    ]);
    expect(state.index).toBe(0);
  });

  it('starts a round for each length pick, keeping the tone already chosen', () => {
    const toned = refineReducer(started(), { type: 'setTone', tone: 'formal' });
    const state = refineReducer(toned, { type: 'setLength', length: 'shorter' });
    expect(state.rounds[1]).toEqual({
      tone: 'formal',
      length: 'shorter',
      instructions: '',
      replacement: null,
    });
  });

  it('accumulates instructions across rounds', () => {
    const first = refineReducer(started(), { type: 'addInstruction', text: '  less corporate ' });
    const second = refineReducer(first, { type: 'addInstruction', text: 'keep it short' });
    expect(second.instructions).toEqual(['less corporate', 'keep it short']);
    expect(second.rounds.map((round) => round.instructions)).toEqual([
      'less corporate',
      'less corporate\nkeep it short',
    ]);
  });

  it('ignores an empty instruction', () => {
    const state = started();
    expect(refineReducer(state, { type: 'addInstruction', text: '   ' })).toBe(state);
  });

  it('ignores an instruction that would exceed the schema limit', () => {
    const state = started();
    const tooLong = 'x'.repeat(MAX_INSTRUCTION_CHARS + 1);
    expect(refineReducer(state, { type: 'addInstruction', text: tooLong })).toBe(state);
  });

  it('reports the remaining instruction budget, counting the separator', () => {
    const state = refineReducer(started(), { type: 'addInstruction', text: 'abc' });
    expect(instructionBudget(state)).toBe(MAX_INSTRUCTION_CHARS - 3 - 1);
  });

  it('fills the pending round when a replacement arrives', () => {
    const pending = refineReducer(started(), { type: 'setTone', tone: 'friendly' });
    const received = refineReducer(pending, { type: 'roundReceived', replacement: 'We changed.' });
    expect(received.rounds[0]?.replacement).toBe('We changed.');
    expect(displayedText(received)).toBe('We changed.');
  });

  it('ignores a replacement when no round is pending', () => {
    const state = started();
    expect(refineReducer(state, { type: 'roundReceived', replacement: 'x' })).toBe(state);
  });

  it('removes the pending round when its request fails', () => {
    const pending = refineReducer(withRounds(started(), ['one']), {
      type: 'setLength',
      length: 'longer',
    });
    const failed = refineReducer(pending, { type: 'roundFailed' });
    expect(failed.rounds).toHaveLength(1);
    expect(failed.index).toBe(0);
  });
});

describe('refineReducer stepping and labels', () => {
  it('shows the round count as n / m and moves between rounds', () => {
    const state = withRounds(started(), ['one', 'two', 'three']);
    expect(roundLabel(state)).toBe('3 / 3');
    expect(canStepForward(state)).toBe(false);
    const back = refineReducer(state, { type: 'stepBack' });
    expect(roundLabel(back)).toBe('2 / 3');
    expect(displayedText(back)).toBe('two');
    expect(canStepBack(back)).toBe(true);
    expect(canStepForward(back)).toBe(true);
    expect(roundLabel(refineReducer(back, { type: 'stepForward' }))).toBe('3 / 3');
  });

  it('does not step past either end', () => {
    const state = withRounds(started(), ['one']);
    expect(refineReducer(state, { type: 'stepForward' })).toBe(state);
    const first = refineReducer(state, { type: 'stepBack' });
    expect(canStepBack(first)).toBe(false);
    expect(refineReducer(first, { type: 'stepBack' })).toBe(first);
  });

  it('discards later rounds when a new pick follows a step back', () => {
    const state = withRounds(started(), ['one', 'two', 'three']);
    const back = refineReducer(state, { type: 'stepBack' });
    const forked = refineReducer(back, { type: 'setTone', tone: 'neutral' });
    expect(forked.rounds).toHaveLength(3);
    expect(forked.rounds[1]?.replacement).toBe('two');
    expect(forked.rounds[2]?.tone).toBe('neutral');
    expect(roundLabel(forked)).toBe('3 / 3');
  });

  it('keeps the diff base as the original text, not the previous round', () => {
    const state = withRounds(started(), ['one', 'two']);
    expect(state.original).toBe(ORIGINAL);
    expect(displayedText(state)).toBe('two');
  });
});

describe('refineReducer requestFor', () => {
  it('returns the request fields of the newest settings', () => {
    const state = refineReducer(refineReducer(started(), { type: 'setTone', tone: 'confident' }), {
      type: 'addInstruction',
      text: 'be brief',
    });
    expect(requestFor(state)).toEqual({
      tone: 'confident',
      length: 'same',
      instructions: 'be brief',
    });
  });
});
