import type { Length, RewriteRequest, Tone } from '@shared/schemas/rewrite';
import { MAX_INSTRUCTION_CHARS } from '@shared/schemas/text';

// D6: the request fields the client sends for the newest round. Paragraph and quote come from the
// editor, so they are not part of the refine state.
export type RewriteRequestFields = Pick<RewriteRequest, 'tone' | 'length' | 'instructions'>;

// One request and its result. `replacement` is null while the request is in flight (D6).
export interface Round {
  readonly tone: Tone;
  readonly length: Length;
  // Every instruction given up to and including this round, joined by INSTRUCTION_SEPARATOR.
  readonly instructions: string;
  readonly replacement: string | null;
}

export interface RefineState {
  // The paragraph as it was before refining. Every diff is taken against this (D6).
  readonly original: string;
  readonly tone: Tone;
  readonly length: Length;
  readonly instructions: readonly string[];
  readonly rounds: readonly Round[];
  // The round on screen. With no rounds it is 0 and means nothing.
  readonly index: number;
}

export type RefineAction =
  | { readonly type: 'start'; readonly original: string }
  | { readonly type: 'setTone'; readonly tone: Tone }
  | { readonly type: 'setLength'; readonly length: Length }
  | { readonly type: 'addInstruction'; readonly text: string }
  | { readonly type: 'roundReceived'; readonly replacement: string }
  | { readonly type: 'roundFailed' }
  | { readonly type: 'stepBack' }
  | { readonly type: 'stepForward' };

const INSTRUCTION_SEPARATOR = '\n';
const DEFAULT_TONE: Tone = 'auto';
const DEFAULT_LENGTH: Length = 'same';
const FIRST_ROUND_NUMBER = 1;

export function initialRefineState(original: string): RefineState {
  return {
    original,
    tone: DEFAULT_TONE,
    length: DEFAULT_LENGTH,
    instructions: [],
    rounds: [],
    index: 0,
  };
}

function joinInstructions(list: readonly string[]): string {
  return list.join(INSTRUCTION_SEPARATOR);
}

// Every pick is a request, so it appends a round built from the settings it was made with. Rounds
// after the one on screen are dropped first (D6: stepping back then asking again forks history).
interface PushInput {
  readonly tone: Tone;
  readonly length: Length;
  readonly list: readonly string[];
}

function pushRound(state: RefineState, next: PushInput): RefineState {
  const round: Round = {
    tone: next.tone,
    length: next.length,
    instructions: joinInstructions(next.list),
    replacement: null,
  };
  const kept = state.rounds.slice(0, state.index + 1);
  return {
    ...state,
    tone: next.tone,
    length: next.length,
    instructions: next.list,
    rounds: [...kept, round],
    index: kept.length,
  };
}

function lastRound(state: RefineState): Round | undefined {
  return state.rounds.at(-1);
}

function isPending(round: Round | undefined): round is Round {
  return round?.replacement === null;
}

// Pure transitions. Invalid ones (no pending round, nothing to step to) return the same state.
export function refineReducer(state: RefineState, action: RefineAction): RefineState {
  switch (action.type) {
    case 'start':
      return initialRefineState(action.original);
    case 'setTone':
      return pushRound(state, {
        tone: action.tone,
        length: state.length,
        list: state.instructions,
      });
    case 'setLength':
      return pushRound(state, {
        tone: state.tone,
        length: action.length,
        list: state.instructions,
      });
    case 'addInstruction':
      return addInstruction(state, action.text);
    case 'roundReceived':
      return receiveRound(state, action.replacement);
    case 'roundFailed':
      return failRound(state);
    case 'stepBack':
      return state.index > 0 ? { ...state, index: state.index - 1 } : state;
    case 'stepForward':
      return canStepForward(state) ? { ...state, index: state.index + 1 } : state;
  }
}

// Empty text is ignored. An instruction that would push the joined text past the schema limit is
// ignored too; instructionBudget tells the input how much room is left.
function addInstruction(state: RefineState, text: string): RefineState {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > instructionBudget(state)) {
    return state;
  }
  return pushRound(state, {
    tone: state.tone,
    length: state.length,
    list: [...state.instructions, trimmed],
  });
}

// Only the newest round can be pending: the client aborts a superseded request.
function receiveRound(state: RefineState, replacement: string): RefineState {
  const last = lastRound(state);
  if (!isPending(last)) {
    return state;
  }
  return {
    ...state,
    rounds: [...state.rounds.slice(0, -1), { ...last, replacement }],
  };
}

// A failed request removes its pending round, so the history only holds results (D14).
function failRound(state: RefineState): RefineState {
  if (!isPending(lastRound(state))) {
    return state;
  }
  const rounds = state.rounds.slice(0, -1);
  return {
    ...state,
    rounds,
    index: Math.max(0, Math.min(state.index, rounds.length - 1)),
  };
}

export function canStepBack(state: RefineState): boolean {
  return state.index > 0;
}

export function canStepForward(state: RefineState): boolean {
  return state.index < state.rounds.length - 1;
}

// "1 / 3" for the round on screen; empty before the first request.
export function roundLabel(state: RefineState): string {
  if (state.rounds.length === 0) {
    return '';
  }
  return `${String(state.index + FIRST_ROUND_NUMBER)} / ${String(state.rounds.length)}`;
}

// The text to show: the round on screen, or the original while that round is still pending.
export function displayedText(state: RefineState): string {
  return state.rounds[state.index]?.replacement ?? state.original;
}

// Characters still free for one more instruction, counting the separator (T5 schema limit).
export function instructionBudget(state: RefineState): number {
  const separator = state.instructions.length === 0 ? 0 : INSTRUCTION_SEPARATOR.length;
  return MAX_INSTRUCTION_CHARS - joinInstructions(state.instructions).length - separator;
}

export function requestFor(state: RefineState): RewriteRequestFields {
  return {
    tone: state.tone,
    length: state.length,
    instructions: joinInstructions(state.instructions),
  };
}
