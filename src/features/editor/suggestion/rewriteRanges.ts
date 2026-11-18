import type { Node } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/react';

// A range of document text, as positions in the current document.
export interface TextRange {
  readonly from: number;
  readonly to: number;
}

// The text of the paragraph (or heading) holding the caret. Null when that block has no text.
export function paragraphRangeAt(editor: Editor): TextRange | null {
  const { $from } = editor.state.selection;
  if (!$from.parent.isTextblock || $from.parent.content.size === 0) {
    return null;
  }
  return { from: $from.start(), to: $from.end() };
}

// The selected text, or null when nothing is selected. Whether it sits in one block is checked
// when the target is built.
export function selectionRangeOf(editor: Editor): TextRange | null {
  const { selection } = editor.state;
  return selection.empty ? null : { from: selection.from, to: selection.to };
}

// D9: the first body paragraph under a heading, up to the next heading. Null when there is none.
// DEBT: "Improve Section" rewrites only this paragraph. Rewriting the whole section needs the
// restructure-section mode of the AI contract; revisit with the section rewrite phase.
export function sectionParagraphRange(doc: Node, headingPos: number): TextRange | null {
  const heading = doc.nodeAt(headingPos);
  if (heading?.type.name !== 'heading') {
    return null;
  }
  let pos = headingPos + heading.nodeSize;
  while (pos < doc.content.size) {
    const node = doc.nodeAt(pos);
    if (node === null || node.type.name === 'heading') {
      return null;
    }
    if (node.type.name === 'paragraph' && node.content.size > 0) {
      return { from: pos + 1, to: pos + node.nodeSize - 1 };
    }
    pos += node.nodeSize;
  }
  return null;
}
