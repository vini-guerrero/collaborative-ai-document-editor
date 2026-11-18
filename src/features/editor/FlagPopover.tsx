import type { JSX } from 'react';
import type { Editor } from '@tiptap/react';
import { BottomSheet, Popover, useBreakpoint } from '@/design-system';
import { FlagPanel } from './FlagPanel';
import { clearFlagsMeta } from './flags/flagsPlugin';
import { useFlags } from './useFlags';

const FLAG_DIALOG_LABEL = 'Writing flag';

export interface FlagPopoverProps {
  editor: Editor;
  // The flag to show, by id; null while no flag is open.
  flagId: string | null;
  onClose: () => void;
  onViewSuggestion?: (() => void) | undefined;
  onAnswer?: ((answer: string) => void) | undefined;
}

// The flag's underline element. Read on each render: useFlags re-renders after every transaction,
// which is what replaces the decoration element.
function flagElementOf(editor: Editor, flagId: string): HTMLElement | null {
  return editor.view.dom.querySelector<HTMLElement>(`[data-flag-id="${flagId}"]`);
}

// S9: a popover from md up, a bottom sheet below. Focus returns to the editor on close (D17).
export function FlagPopover({
  editor,
  flagId,
  onClose,
  onViewSuggestion,
  onAnswer,
}: FlagPopoverProps): JSX.Element {
  const breakpoint = useBreakpoint();
  const flag = useFlags(editor).find((entry) => entry.id === flagId);
  const anchor = flag === undefined ? null : flagElementOf(editor, flag.id);
  const isOpen = flag !== undefined;
  const returnFocusTo = (): HTMLElement => editor.view.dom;

  const panel =
    flag === undefined ? null : (
      <FlagPanel
        flag={flag}
        onViewSuggestion={onViewSuggestion}
        onAnswer={onAnswer}
        onDismiss={() => {
          editor.view.dispatch(clearFlagsMeta(editor.state.tr, flag.id));
          onClose();
        }}
      />
    );

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
