import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { Box } from './toolbarPosition';

// The rectangle of the selection in client coordinates, or null when the selection is collapsed,
// spans blocks, or the toolbar is not enabled (D9).
function selectionBox(editor: Editor): Box | null {
  const { selection } = editor.state;
  if (selection.empty || !selection.$from.sameParent(selection.$to)) {
    return null;
  }
  const start = editor.view.coordsAtPos(selection.from);
  const end = editor.view.coordsAtPos(selection.to);
  const left = Math.min(start.left, end.left);
  const top = Math.min(start.top, end.top);
  return {
    top,
    left,
    width: Math.max(start.right, end.right) - left,
    height: Math.max(start.bottom, end.bottom) - top,
  };
}

// Re-measures on every transaction and on scroll or resize, so the toolbar follows the text. The
// listeners are removed on cleanup. The toolbar is fixed, so it must be re-measured on scroll.
export function useSelectionBox(editor: Editor | null, enabled: boolean): Box | null {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    if (editor === null) {
      return undefined;
    }
    const measure = (): void => {
      setBox(enabled ? selectionBox(editor) : null);
    };
    measure();
    editor.on('transaction', measure);
    window.addEventListener('scroll', measure, { capture: true, passive: true });
    window.addEventListener('resize', measure);
    return () => {
      editor.off('transaction', measure);
      window.removeEventListener('scroll', measure, { capture: true });
      window.removeEventListener('resize', measure);
    };
  }, [editor, enabled]);

  return box;
}
