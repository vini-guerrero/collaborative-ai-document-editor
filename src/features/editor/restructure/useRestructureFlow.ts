import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { RestructureAction, RestructureOperation } from '@shared/schemas/restructure';
import { useAiClient } from '@/features/ai';
import { serializeMarkdown } from '../markdown/markdown';
import { failureOf, type SuggestionFailure } from '../suggestion/suggestionRequest';
import { applyRestructure } from './applyRestructure';
import { describeOperation } from './describeOperation';
import { clearRestructureMeta, setRestructureMeta } from './restructurePreviewPlugin';
import {
  isActionPossible,
  requestSectionsOf,
  sectionIndexAt,
  type RequestSectionsFailure,
} from './requestSections';
import { outline, type Section } from './sections';

// Why a restructure cannot be shown or applied. Mapped to D14 text by the panel.
export type RestructureFailure =
  RequestSectionsFailure | SuggestionFailure | 'invalid_index' | 'noop' | 'invalid_markdown';

export type RestructureState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready';
      readonly operation: RestructureOperation;
      readonly sections: readonly Section[];
    }
  | { readonly kind: 'error'; readonly reason: RestructureFailure };

export interface RestructureFlow {
  readonly state: RestructureState;
  // Asks the AI for an operation on the section that holds the caret (D10).
  readonly run: (action: RestructureAction) => void;
  // Applies the previewed operation as one undo step and reports it for history (D7, D11).
  readonly accept: () => void;
  readonly dismiss: () => void;
}

// D10, D11: the restructure suggestion. The preview is decorations only (T3); any document change
// ends the suggestion, because its section indexes no longer match the text.
export function useRestructureFlow(
  editor: Editor | null,
  onApplied: (label: string, before: string) => void,
): RestructureFlow {
  const client = useAiClient();
  const [state, setState] = useState<RestructureState>({ kind: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);
  const onAppliedRef = useRef(onApplied);

  useEffect(() => {
    onAppliedRef.current = onApplied;
  });

  useEffect(() => {
    if (editor === null) {
      return undefined;
    }
    const controller = controllerRef;
    const reset = (): void => {
      controller.current?.abort();
      controller.current = null;
      setState({ kind: 'idle' });
    };
    editor.on('update', reset);
    return () => {
      editor.off('update', reset);
      controller.current?.abort();
    };
  }, [editor]);

  const run = (action: RestructureAction): void => {
    if (editor === null) {
      return;
    }
    const sections = outline(serializeMarkdown(editor));
    const requested = requestSectionsOf(sections);
    controllerRef.current?.abort();
    controllerRef.current = null;
    editor.view.dispatch(clearRestructureMeta(editor.state.tr));
    if (!requested.ok) {
      setState({ kind: 'error', reason: requested.reason });
      return;
    }
    const section = sectionIndexAt(editor.state.doc, editor.state.selection.from);
    if (!isActionPossible(editor.state.doc, action, section)) {
      setState({ kind: 'error', reason: 'nothing_to_do' });
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ kind: 'loading' });
    void client
      .run<'restructure'>(
        { task: 'restructure', action, section, sections: requested.sections },
        controller.signal,
      )
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        controllerRef.current = null;
        if (!result.ok) {
          setState({ kind: 'error', reason: failureOf(result.error.kind) });
          return;
        }
        editor.view.dispatch(setRestructureMeta(editor.state.tr, result.value));
        setState({ kind: 'ready', operation: result.value, sections });
      });
  };

  const accept = (): void => {
    if (editor === null || state.kind !== 'ready') {
      return;
    }
    const before = serializeMarkdown(editor);
    const result = applyRestructure(editor, state.operation);
    if (!result.ok) {
      setState({ kind: 'error', reason: result.reason });
      return;
    }
    const label = describeOperation(state.sections, state.operation);
    setState({ kind: 'idle' });
    onAppliedRef.current(label, before);
  };

  const dismiss = (): void => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    if (editor !== null) {
      editor.view.dispatch(clearRestructureMeta(editor.state.tr));
    }
    setState({ kind: 'idle' });
  };

  return { state, run, accept, dismiss };
}
