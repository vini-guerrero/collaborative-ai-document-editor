import type { MouseEvent } from 'react';

// Form controls take the press as usual; everything else keeps the editor's focus and selection.
const FORM_CONTROLS = 'input, textarea, select';

// A button takes focus and collapses the text selection on mousedown. Preventing that default
// keeps the editor's selection, so the action reads the text the author selected (D9).
export function keepEditorSelection(event: MouseEvent<HTMLElement>): void {
  const { target } = event;
  if (target instanceof Element && target.closest(FORM_CONTROLS) !== null) {
    return;
  }
  event.preventDefault();
}
