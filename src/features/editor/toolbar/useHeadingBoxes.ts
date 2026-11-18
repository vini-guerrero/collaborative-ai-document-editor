import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { sectionParagraphRange, type TextRange } from '../suggestion/rewriteRanges';

// A heading that has a body paragraph to improve, with its place in the editor frame.
export interface HeadingBox {
  readonly pos: number;
  // Offset from the top of the editor frame, in px.
  readonly top: number;
  readonly range: TextRange;
}

const FRAME_SELECTOR = '.editor-surface-frame';

// Reads every heading's position from the rendered editor. Empty when the frame is not mounted.
function measureHeadings(editor: Editor): HeadingBox[] {
  const frame = editor.view.dom.closest<HTMLElement>(FRAME_SELECTOR);
  if (frame === null) {
    return [];
  }
  const frameTop = frame.getBoundingClientRect().top;
  const boxes: HeadingBox[] = [];
  editor.state.doc.forEach((node, offset) => {
    if (node.type.name !== 'heading') {
      return;
    }
    const range = sectionParagraphRange(editor.state.doc, offset);
    const dom = editor.view.nodeDOM(offset);
    if (range === null || !(dom instanceof HTMLElement)) {
      return;
    }
    boxes.push({ pos: offset, top: dom.getBoundingClientRect().top - frameTop, range });
  });
  return boxes;
}

// Keeps the heading boxes current after every transaction and on resize (D9).
export function useHeadingBoxes(editor: Editor | null): readonly HeadingBox[] {
  const [boxes, setBoxes] = useState<readonly HeadingBox[]>([]);

  useEffect(() => {
    if (editor === null) {
      return undefined;
    }
    const measure = (): void => {
      setBoxes(measureHeadings(editor));
    };
    measure();
    editor.on('transaction', measure);
    window.addEventListener('resize', measure);
    return () => {
      editor.off('transaction', measure);
      window.removeEventListener('resize', measure);
    };
  }, [editor]);

  return boxes;
}
