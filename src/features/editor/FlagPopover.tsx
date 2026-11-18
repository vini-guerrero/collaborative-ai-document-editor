import { useEffect, type JSX } from 'react';
import type { Editor } from '@tiptap/react';
import { BottomSheet, Popover, useBreakpoint } from '@/design-system';
import { FlagPanel } from './FlagPanel';
import { clearFlagsMeta } from './flags/flagsPlugin';
import type { FlagEntry } from './flags/flagsState';
import { applySuggestion } from './suggestion/applySuggestion';
import { SuggestionCard } from './suggestion/SuggestionCard';
import { clearSuggestionMeta, getSuggestion } from './suggestion/suggestionPlugin';
import type { SuggestionRequestHandle } from './suggestion/useSuggestionRequest';
import { useSuggestionRequest } from './suggestion/useSuggestionRequest';
import { useFlags } from './useFlags';

const FLAG_DIALOG_LABEL = 'Writing flag';

export interface FlagPopoverProps {
  editor: Editor;
  // The flag to show, by id; null while no flag is open.
  flagId: string | null;
  onClose: () => void;
  onAnswer?: ((answer: string) => void) | undefined;
}

// The flag's underline element. Read on each render: useFlags re-renders after every transaction,
// which is what replaces the decoration element.
function flagElementOf(editor: Editor, flagId: string): HTMLElement | null {
  return editor.view.dom.querySelector<HTMLElement>(`[data-flag-id="${flagId}"]`);
}

// D17: Dismiss drops the flag and any preview on it.
function dismissFlag(editor: Editor, flag: FlagEntry): void {
  editor.view.dispatch(clearSuggestionMeta(clearFlagsMeta(editor.state.tr, flag.id)));
}

// The panel: the flag, or the suggestion card once "View suggestion" has been pressed (D5).
interface PanelInputs {
  editor: Editor;
  flag: FlagEntry | undefined;
  suggestion: SuggestionRequestHandle;
  onClose: () => void;
  onAnswer: ((answer: string) => void) | undefined;
}

function panelFor({
  editor,
  flag,
  suggestion,
  onClose,
  onAnswer,
}: PanelInputs): JSX.Element | null {
  const { request, start, fail } = suggestion;
  if (flag === undefined) {
    return null;
  }
  const onDismiss = (): void => {
    dismissFlag(editor, flag);
    onClose();
  };
  if (request.kind !== 'idle' && request.flag.id === flag.id) {
    const onAccept = (): void => {
      const current = getSuggestion(editor.state);
      if (current === null) {
        return;
      }
      const result = applySuggestion(editor, current);
      if (result.ok) {
        onClose();
      } else {
        fail(result.reason);
      }
    };
    return <SuggestionCard request={request} onAccept={onAccept} onDismiss={onDismiss} />;
  }
  return (
    <FlagPanel
      flag={flag}
      onDismiss={onDismiss}
      onViewSuggestion={() => {
        start(flag);
      }}
      onAnswer={onAnswer}
    />
  );
}

// S9: a popover from md up, a bottom sheet below. Focus returns to the editor on close (D17).
export function FlagPopover({ editor, flagId, onClose, onAnswer }: FlagPopoverProps): JSX.Element {
  const breakpoint = useBreakpoint();
  const flag = useFlags(editor).find((entry) => entry.id === flagId);
  const suggestion = useSuggestionRequest(editor);
  const { request, stop } = suggestion;

  // A preview belongs to the flag it was asked for: closing, or opening another flag, ends it.
  useEffect(() => {
    if (request.kind !== 'idle' && request.flag.id !== flagId) {
      stop();
      editor.view.dispatch(clearSuggestionMeta(editor.state.tr));
    }
  }, [editor, flagId, request, stop]);

  const anchor = flag === undefined ? null : flagElementOf(editor, flag.id);
  const isOpen = flag !== undefined;
  const returnFocusTo = (): HTMLElement => editor.view.dom;
  const panel = panelFor({ editor, flag, suggestion, onClose, onAnswer });

  if (breakpoint === 'base' || breakpoint === 'sm') {
    return (
      <BottomSheet
        open={isOpen}
        onClose={onClose}
        label={FLAG_DIALOG_LABEL}
        returnFocusTo={returnFocusTo}
      >
        {panel}
      </BottomSheet>
    );
  }
  return (
    <Popover
      anchor={anchor}
      open={isOpen}
      onClose={onClose}
      label={FLAG_DIALOG_LABEL}
      returnFocusTo={returnFocusTo}
    >
      {panel}
    </Popover>
  );
}
