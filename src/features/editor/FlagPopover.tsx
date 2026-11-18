import type { JSX } from 'react';
import type { Editor } from '@tiptap/react';
import { BottomSheet, Popover, useBreakpoint } from '@/design-system';
import { FlagPanel, KIND_LABELS } from './FlagPanel';
import { clearFlagsMeta } from './flags/flagsPlugin';
import type { FlagEntry } from './flags/flagsState';
import { applySuggestion } from './suggestion/applySuggestion';
import { refineControlsFor } from './suggestion/refineControlsFor';
import { rewriteTargetOf, type RewriteTarget } from './suggestion/rewriteTarget';
import { SuggestionCard } from './suggestion/SuggestionCard';
import { getSuggestion } from './suggestion/suggestionPlugin';
import type { RewriteSession, RoundPick } from './suggestion/useRewriteSession';
import { useFlags } from './useFlags';

const FLAG_DIALOG_LABEL = 'Writing flag';
const SUGGESTION_DIALOG_LABEL = 'Suggestion';
// D6 default for "View suggestion": the AI picks the tone.
const FLAG_VIEW_PICK: RoundPick = { type: 'setTone', tone: 'auto' };

export interface FlagPopoverProps {
  editor: Editor;
  // The flag whose popover is open, by id; null while no flag is open.
  flagId: string | null;
  // The rewrite in progress (D5, D9). It shows in this popover, anchored to its text.
  session: RewriteSession;
  onClose: () => void;
  // Reports an accepted rewrite, by its card title, for the history (D7).
  onAccepted: (label: string) => void;
  onAnswer?: ((answer: string) => void) | undefined;
}

// The flag's underline element. Read on each render: useFlags re-renders after every transaction,
// which is what replaces the decoration element.
function flagElementOf(editor: Editor, flagId: string): HTMLElement | null {
  return editor.view.dom.querySelector<HTMLElement>(`[data-flag-id="${flagId}"]`);
}

// The block element holding a document position, for a rewrite that is not tied to a flag.
function blockElementAt(editor: Editor, pos: number): HTMLElement | null {
  const { node } = editor.view.domAtPos(pos);
  const element = node instanceof HTMLElement ? node : node.parentElement;
  return element?.closest<HTMLElement>('p, h1, h2, h3, h4, h5, h6, li, blockquote') ?? null;
}

// The element the popover hangs from: the flag's underline, or the text a rewrite works on.
function anchorOf(
  editor: Editor,
  target: RewriteTarget | null,
  flagId: string | null,
): HTMLElement | null {
  if (target === null) {
    return flagId === null ? null : flagElementOf(editor, flagId);
  }
  if (target.flagId !== undefined) {
    return flagElementOf(editor, target.flagId);
  }
  return blockElementAt(editor, target.from);
}

interface PanelInputs {
  editor: Editor;
  session: RewriteSession;
  flag: FlagEntry | undefined;
  close: () => void;
  onAccepted: (label: string) => void;
  onAnswer: ((answer: string) => void) | undefined;
}

// The panel: the rewrite card while a rewrite is open, otherwise the flag (D5).
function panelFor({
  editor,
  session,
  flag,
  close,
  onAccepted,
  onAnswer,
}: PanelInputs): JSX.Element | null {
  const { target, outcome } = session;
  if (target !== null && outcome !== null) {
    const onAccept = (): void => {
      const current = getSuggestion(editor.state);
      if (current === null) {
        session.fail('stale');
        return;
      }
      const result = applySuggestion(editor, current);
      if (result.ok) {
        onAccepted(target.title);
        close();
      } else {
        session.fail(result.reason);
      }
    };
    const onDismiss = (): void => {
      if (target.flagId !== undefined) {
        editor.view.dispatch(clearFlagsMeta(editor.state.tr, target.flagId));
      }
      close();
    };
    return (
      <SuggestionCard
        request={outcome}
        refine={refineControlsFor(session)}
        onAccept={onAccept}
        onDismiss={onDismiss}
      />
    );
  }
  if (flag === undefined) {
    return null;
  }
  return (
    <FlagPanel
      flag={flag}
      onDismiss={() => {
        editor.view.dispatch(clearFlagsMeta(editor.state.tr, flag.id));
        close();
      }}
      onViewSuggestion={() => {
        const flagTarget = rewriteTargetOf(editor.state.doc, flag, {
          title: KIND_LABELS[flag.kind],
          detail: flag.reason,
          flagId: flag.id,
        });
        if (flagTarget !== null) {
          session.start(flagTarget, FLAG_VIEW_PICK);
        }
      }}
      onAnswer={onAnswer}
    />
  );
}

// S9: a popover from md up, a bottom sheet below. Focus returns to the editor on close (D17).
// Closing ends the rewrite, so no preview is left behind (D5).
export function FlagPopover({
  editor,
  flagId,
  session,
  onClose,
  onAccepted,
  onAnswer,
}: FlagPopoverProps): JSX.Element {
  const breakpoint = useBreakpoint();
  const flag = useFlags(editor).find((entry) => entry.id === flagId);
  const { target } = session;
  const close = (): void => {
    session.stop();
    onClose();
  };

  const isOpen = target !== null || flag !== undefined;
  const anchor = anchorOf(editor, target, flagId);
  const label =
    target !== null && target.flagId === undefined ? SUGGESTION_DIALOG_LABEL : FLAG_DIALOG_LABEL;
  const returnFocusTo = (): HTMLElement => editor.view.dom;
  const panel = panelFor({ editor, session, flag, close, onAccepted, onAnswer });

  if (breakpoint === 'base' || breakpoint === 'sm') {
    return (
      <BottomSheet open={isOpen} onClose={close} label={label} returnFocusTo={returnFocusTo}>
        {panel}
      </BottomSheet>
    );
  }
  return (
    <Popover
      anchor={anchor}
      open={isOpen}
      onClose={close}
      label={label}
      returnFocusTo={returnFocusTo}
    >
      {panel}
    </Popover>
  );
}
