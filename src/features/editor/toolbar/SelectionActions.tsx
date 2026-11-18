import type { JSX } from 'react';
import type { Editor } from '@tiptap/react';
import type { RewriteActions } from '../suggestion/rewriteActions';
import { SelectionToolbar } from './SelectionToolbar';
import { useSelectionBox } from './useSelectionBox';
import { useVisualViewport } from './useVisualViewport';

// D6 default for "Fix Tone": the AI is asked to fix the tone, and the tone picker stays on auto.
const FIX_TONE_INSTRUCTION = 'Fix the tone';

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
  const viewport = useVisualViewport();
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
