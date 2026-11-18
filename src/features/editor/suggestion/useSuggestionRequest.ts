import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useAiClient } from '@/features/ai';
import { getFlags } from '../flags/flagsPlugin';
import type { FlagEntry } from '../flags/flagsState';
import { paragraphContextOf, paragraphIdAt, paragraphsOf } from '../paragraphs';
import { getSuggestion, setSuggestionMeta } from './suggestionPlugin';
import type { Suggestion } from './suggestionState';

// Why a suggestion could not be shown. Mapped to plain text by the card (D14).
export type SuggestionFailure = 'out_of_credit' | 'unavailable' | 'stale';

export type SuggestionRequest =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading'; readonly flag: FlagEntry }
  | { readonly kind: 'ready'; readonly flag: FlagEntry }
  | { readonly kind: 'empty'; readonly flag: FlagEntry }
  | { readonly kind: 'error'; readonly flag: FlagEntry; readonly reason: SuggestionFailure };

export interface SuggestionRequestHandle {
  readonly request: SuggestionRequest;
  // Asks the AI for a rewrite of the flag's quote. Starting again cancels the earlier request.
  readonly start: (flag: FlagEntry) => void;
  // Cancels a pending request and forgets its outcome. The caller clears the preview.
  readonly stop: () => void;
  // Shows a failure for the current request, e.g. when an accept is refused as stale.
  readonly fail: (reason: SuggestionFailure) => void;
}

const IDLE: SuggestionRequest = { kind: 'idle' };
// D6 defaults: the AI picks the tone and keeps the length; no extra instructions yet.
const DEFAULT_TONE = 'auto';
const DEFAULT_LENGTH = 'same';

// The paragraph the flag sits in, as the rewrite request needs it (D4 context is not used here).
function paragraphTextAt(editor: Editor, flag: FlagEntry): string | undefined {
  const { doc } = editor.state;
  const paragraphs = paragraphsOf(doc);
  const id = paragraphIdAt(paragraphs, doc.resolve(flag.from));
  return id === undefined ? undefined : paragraphContextOf(paragraphs, id)?.text;
}

// Builds the suggestion from the flag's current position, since the document may have changed
// while the request ran. The plugin rejects it if the text no longer matches (T10).
function settle(editor: Editor, flag: FlagEntry, replacement: string): SuggestionRequest {
  const current = getFlags(editor.state).find((entry) => entry.id === flag.id);
  if (current?.quote !== flag.quote) {
    return { kind: 'error', flag, reason: 'stale' };
  }
  if (replacement === current.quote) {
    return { kind: 'empty', flag };
  }
  const suggestion: Suggestion = {
    from: current.from,
    to: current.to,
    quote: current.quote,
    replacement,
    blockHash: current.blockHash,
    flagId: current.id,
  };
  editor.view.dispatch(setSuggestionMeta(editor.state.tr, suggestion));
  return getSuggestion(editor.state) === null
    ? { kind: 'error', flag, reason: 'stale' }
    : { kind: 'ready', flag };
}

// D14: an out-of-credit answer is its own message; every other failure reads as unavailable.
const failureOf = (kind: string): SuggestionFailure =>
  kind === 'out_of_credit' ? 'out_of_credit' : 'unavailable';

// Owns the rewrite request for one open suggestion. The AI call goes through the typed client,
// so the status indicator follows it (D14). The request is cancelled on stop and on unmount.
export function useSuggestionRequest(editor: Editor): SuggestionRequestHandle {
  const client = useAiClient();
  const [request, setRequest] = useState<SuggestionRequest>(IDLE);
  const controllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRequest(IDLE);
  }, []);

  // Cleanup only: a request must not outlive the popover that asked for it.
  useEffect(() => stop, [stop]);

  const fail = useCallback((reason: SuggestionFailure) => {
    setRequest((previous) =>
      previous.kind === 'idle' ? previous : { kind: 'error', flag: previous.flag, reason },
    );
  }, []);

  const start = (flag: FlagEntry): void => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRequest({ kind: 'loading', flag });
    const paragraph = paragraphTextAt(editor, flag);
    if (paragraph === undefined) {
      setRequest({ kind: 'error', flag, reason: 'stale' });
      return;
    }
    void client
      .run<'rewrite'>(
        {
          task: 'rewrite',
          paragraph,
          quote: flag.quote,
          tone: DEFAULT_TONE,
          length: DEFAULT_LENGTH,
          instructions: '',
        },
        controller.signal,
      )
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        setRequest(
          result.ok
            ? settle(editor, flag, result.value.replacement)
            : { kind: 'error', flag, reason: failureOf(result.error.kind) },
        );
      });
  };

  return { request, start, stop, fail };
}
