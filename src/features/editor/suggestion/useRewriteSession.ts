import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useAiClient } from '@/features/ai';
import {
  displayedText,
  initialRefineState,
  refineReducer,
  requestFor,
  type RefineAction,
  type RefineState,
} from '../refine/refineReducer';
import { suggestionFor, type RewriteTarget } from './rewriteTarget';
import { clearSuggestionMeta, getSuggestion, setSuggestionMeta } from './suggestionPlugin';
import { failureOf, type SuggestionFailure, type SuggestionRequest } from './suggestionRequest';
import type { Suggestion } from './suggestionState';

// The picks that ask the AI for a round (D6). Each one appends a round and sends a request.
export type RoundPick = Extract<
  RefineAction,
  { readonly type: 'setTone' | 'setLength' | 'addInstruction' }
>;

// One rewrite in progress: where it applies, its rounds (D6) and the last failure (D14).
interface SessionState {
  readonly target: RewriteTarget;
  readonly refine: RefineState;
  readonly failure: SuggestionFailure | null;
}

export interface RewriteSession {
  // The target being rewritten, or null when no rewrite is open.
  readonly target: RewriteTarget | null;
  readonly outcome: SuggestionRequest | null;
  readonly refine: RefineState | null;
  // True while the newest round is in flight.
  readonly busy: boolean;
  // Starts a rewrite of the target; `first` is its first round (a tone, length or instruction pick).
  readonly start: (target: RewriteTarget, first: RoundPick) => void;
  readonly pick: (action: RoundPick) => void;
  readonly stepBack: () => void;
  readonly stepForward: () => void;
  readonly fail: (reason: SuggestionFailure) => void;
  // Cancels any request and removes the preview. The document is not changed (T3).
  readonly stop: () => void;
}

function isDisplayedPending(refine: RefineState): boolean {
  return refine.rounds[refine.index]?.replacement === null;
}

// What the card shows: failures first, then loading, then no change, then a suggestion (D14).
export function outcomeOf({ target, refine, failure }: SessionState): SuggestionRequest {
  if (failure !== null) {
    return { kind: 'error', target, reason: failure };
  }
  if (isDisplayedPending(refine)) {
    return { kind: 'loading', target };
  }
  return displayedText(refine) === refine.original
    ? { kind: 'empty', target }
    : { kind: 'ready', target };
}

// Puts the displayed round in the document as a preview. The diff is always against the original
// quote (D6). Returns the state with a stale failure when the range no longer matches (T10).
function showDisplayed(editor: Editor, state: SessionState): SessionState {
  const base: Suggestion =
    getSuggestion(editor.state) ?? suggestionFor(state.target, state.target.quote);
  editor.view.dispatch(
    setSuggestionMeta(editor.state.tr, { ...base, replacement: displayedText(state.refine) }),
  );
  return getSuggestion(editor.state) === null ? { ...state, failure: 'stale' } : state;
}

// Owns one open rewrite: its rounds, the preview and the request in flight. Every AI call goes
// through the typed client, so the status indicator follows it (D14). The request is aborted when
// it is superseded, stopped, or the component unmounts.
export function useRewriteSession(editor: Editor | null): RewriteSession {
  const client = useAiClient();
  const [session, setSession] = useState<SessionState | null>(null);
  // The latest state for async results and callbacks; state itself is what renders.
  const sessionRef = useRef<SessionState | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = controllerRef;
    return () => {
      controller.current?.abort();
    };
  }, []);

  const commit = (next: SessionState | null): void => {
    sessionRef.current = next;
    setSession(next);
  };

  const abort = (): void => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  };

  const requestRound = (current: Editor, state: SessionState): void => {
    abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    void client
      .run<'rewrite'>(
        {
          task: 'rewrite',
          paragraph: state.target.paragraph,
          quote: state.target.quote,
          ...requestFor(state.refine),
        },
        controller.signal,
      )
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        controllerRef.current = null;
        const latest = sessionRef.current;
        if (latest?.target !== state.target) {
          return;
        }
        commit(
          result.ok
            ? showDisplayed(current, {
                ...latest,
                refine: refineReducer(latest.refine, {
                  type: 'roundReceived',
                  replacement: result.value.replacement,
                }),
                failure: null,
              })
            : showDisplayed(current, {
                ...latest,
                refine: refineReducer(latest.refine, { type: 'roundFailed' }),
                failure: failureOf(result.error.kind),
              }),
        );
      });
  };

  // A pending round that a new pick supersedes is dropped (its request is aborted). A pick that
  // changes nothing, such as an empty instruction, leaves the session as it is.
  const applyPick = (current: Editor, base: SessionState, action: RoundPick): void => {
    const settled = refineReducer(base.refine, { type: 'roundFailed' });
    const refine = refineReducer(settled, action);
    if (refine.rounds.length === settled.rounds.length) {
      return;
    }
    const next = showDisplayed(current, { ...base, refine, failure: null });
    commit(next);
    if (next.failure === null) {
      requestRound(current, next);
    }
  };

  const start = (target: RewriteTarget, first: RoundPick): void => {
    if (editor === null) {
      return;
    }
    abort();
    editor.view.dispatch(clearSuggestionMeta(editor.state.tr));
    commit(null);
    applyPick(editor, { target, refine: initialRefineState(target.quote), failure: null }, first);
  };

  const pick = (action: RoundPick): void => {
    const current = sessionRef.current;
    if (editor === null || current === null) {
      return;
    }
    applyPick(editor, current, action);
  };

  const step = (action: RefineAction): void => {
    const current = sessionRef.current;
    if (editor === null || current === null) {
      return;
    }
    const refine = refineReducer(current.refine, action);
    if (refine !== current.refine) {
      commit(showDisplayed(editor, { ...current, refine, failure: null }));
    }
  };

  const stop = (): void => {
    abort();
    if (editor !== null) {
      editor.view.dispatch(clearSuggestionMeta(editor.state.tr));
    }
    commit(null);
  };

  const fail = (reason: SuggestionFailure): void => {
    const current = sessionRef.current;
    if (current !== null) {
      commit({ ...current, failure: reason });
    }
  };

  return {
    target: session?.target ?? null,
    outcome: session === null ? null : outcomeOf(session),
    refine: session?.refine ?? null,
    busy: session !== null && session.refine.rounds.at(-1)?.replacement === null,
    start,
    pick,
    stepBack: () => {
      step({ type: 'stepBack' });
    },
    stepForward: () => {
      step({ type: 'stepForward' });
    },
    fail,
    stop,
  };
}
