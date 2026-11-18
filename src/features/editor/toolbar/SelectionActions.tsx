import type { JSX } from 'react';
import type { Editor } from '@tiptap/react';
import type { RewriteActions } from '../suggestion/rewriteActions';
import { SelectionToolbar } from './SelectionToolbar';
import { useSelectionBox } from './useSelectionBox';
import { useVisualViewport } from './useVisualViewport';

// D6 default for "Fix Tone": the AI is asked to fix the tone, and the tone picker stays on auto.
const FIX_TONE_INSTRUCTION = 'Fix the tone';
// The footer and the formatting bar float over the bottom of the screen (about 48px, a gap and
// 44px), so the selection bubble must not be placed under them.
const BOTTOM_BARS_INSET_PX = 120;

export interface SelectionActionsProps {
  editor: Editor | null;
  // False while a rewrite card is open or the raw Markdown view is shown (D15).
  enabled: boolean;
  actions: RewriteActions;
}

// D9: the selection toolbar wired to the rewrite actions. It shows only while text is selected,
// and it never takes focus from the editor.
export function SelectionActions({
  editor,
  enabled,
  actions,
}: SelectionActionsProps): JSX.Element | null {
  const box = useSelectionBox(editor, enabled);
  const fullViewport = useVisualViewport();
  const viewport = {
    ...fullViewport,
    height: fullViewport.height - BOTTOM_BARS_INSET_PX,
  };
  return (
    <SelectionToolbar
      anchorRect={box}
      viewport={viewport}
      onRewrite={() => {
        actions.rewriteSelection({ type: 'setTone', tone: 'auto' });
      }}
      onFixTone={() => {
        actions.rewriteSelection({ type: 'addInstruction', text: FIX_TONE_INSTRUCTION });
      }}
      onShorten={() => {
        actions.rewriteSelection({ type: 'setLength', length: 'shorter' });
      }}
      onInstruction={(text) => {
        actions.rewriteSelection({ type: 'addInstruction', text });
      }}
      onDismiss={actions.collapseSelection}
    />
  );
}
