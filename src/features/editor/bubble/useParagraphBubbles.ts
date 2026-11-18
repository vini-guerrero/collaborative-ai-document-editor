import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { hashOfText } from '../analyze/paragraphContext';
import type { FlagEntry } from '../flags/flagsState';
import { paragraphsOf } from '../paragraphs';

// One AI bubble beside a paragraph: loading while the AI reads it, ready while suggestions wait.
export interface ParagraphBubble {
  readonly pos: number;
  // Offset from the top of the editor frame, in px.
  readonly top: number;
  readonly state: 'loading' | 'ready';
  readonly count: number;
  // The flag a click opens first (the earliest in the paragraph).
  readonly firstFlagId: string | undefined;
}

const FRAME_SELECTOR = '.editor-surface-frame';

// Reads each paragraph that needs a bubble from the rendered editor. Empty when the frame is not
// mounted. Loading wins over ready: a paragraph being re-analyzed shows that the AI is working.
function measureBubbles(
  editor: Editor,
  analyzingHash: string | null,
  flags: readonly FlagEntry[],
): ParagraphBubble[] {
  const frame = editor.view.dom.closest<HTMLElement>(FRAME_SELECTOR);
  if (frame === null) {
    return [];
  }
  const frameTop = frame.getBoundingClientRect().top;
  const bubbles: ParagraphBubble[] = [];
  for (const paragraph of paragraphsOf(editor.state.doc)) {
    const node = editor.state.doc.nodeAt(paragraph.pos);
    const dom = editor.view.nodeDOM(paragraph.pos);
    if (node === null || !(dom instanceof HTMLElement)) {
      continue;
    }
    const end = paragraph.pos + node.nodeSize;
    const inside = flags.filter((flag) => flag.from >= paragraph.pos && flag.to <= end);
    const loading = analyzingHash !== null && hashOfText(paragraph.text) === analyzingHash;
    if (!loading && inside.length === 0) {
      continue;
    }
    bubbles.push({
      pos: paragraph.pos,
      top: dom.getBoundingClientRect().top - frameTop,
      state: loading ? 'loading' : 'ready',
      count: inside.length,
      firstFlagId: inside[0]?.id,
    });
  }
  return bubbles;
}

// Keeps the bubbles current after every transaction, on resize and when the analysis or the flags
// change. Positions are frame-relative, so scrolling needs no update.
export function useParagraphBubbles(
  editor: Editor | null,
  analyzingHash: string | null,
  flags: readonly FlagEntry[],
): readonly ParagraphBubble[] {
  const [bubbles, setBubbles] = useState<readonly ParagraphBubble[]>([]);

  useEffect(() => {
    if (editor === null) {
      return undefined;
    }
    const measure = (): void => {
      setBubbles(measureBubbles(editor, analyzingHash, flags));
    };
    measure();
    editor.on('transaction', measure);
    window.addEventListener('resize', measure);
    return () => {
      editor.off('transaction', measure);
      window.removeEventListener('resize', measure);
    };
  }, [editor, analyzingHash, flags]);

  return bubbles;
}
