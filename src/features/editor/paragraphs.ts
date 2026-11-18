import type { Node, ResolvedPos } from '@tiptap/pm/model';
import { MAX_HEADING_CHARS, MAX_PARAGRAPH_CHARS } from '@shared/schemas';
import type { ParagraphContext } from './analyze/paragraphContext';

// One paragraph of the document, with what the AI needs to judge it (D4).
export interface ParagraphInfo {
  readonly id: string;
  // Position before the paragraph node in the current document.
  readonly pos: number;
  readonly text: string;
  readonly heading: string | undefined;
}

// Ids are the paragraph's ordinal. They change when a paragraph is inserted above, which is safe:
// a result is applied only when its text hash still matches the paragraph (T10).
const paragraphIdOf = (index: number): string => `p${String(index)}`;

// Neighbors are clipped to the request bound (T5) so one long paragraph cannot block the next.
const clipNeighbor = (text: string | undefined): string | undefined =>
  text?.slice(0, MAX_PARAGRAPH_CHARS);

// Every paragraph in document order. Headings set the context of the paragraphs after them.
export function paragraphsOf(doc: Node): ParagraphInfo[] {
  const paragraphs: ParagraphInfo[] = [];
  let heading: string | undefined;
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      heading = node.textContent.slice(0, MAX_HEADING_CHARS);
      return false;
    }
    if (node.type.name === 'paragraph') {
      paragraphs.push({
        id: paragraphIdOf(paragraphs.length),
        pos,
        text: node.textContent,
        heading,
      });
      return false;
    }
    return true;
  });
  return paragraphs;
}

// The id of the paragraph holding the caret, or undefined when the caret is in a heading.
export function paragraphIdAt(
  paragraphs: readonly ParagraphInfo[],
  $from: ResolvedPos,
): string | undefined {
  if ($from.depth === 0) {
    return undefined;
  }
  const pos = $from.before();
  return paragraphs.find((paragraph) => paragraph.pos === pos)?.id;
}

// The analysis context for one paragraph, with its neighbors. Undefined for an unknown id.
export function paragraphContextOf(
  paragraphs: readonly ParagraphInfo[],
  id: string,
): ParagraphContext | undefined {
  const index = paragraphs.findIndex((paragraph) => paragraph.id === id);
  const paragraph = paragraphs[index];
  if (paragraph === undefined) {
    return undefined;
  }
  return {
    id: paragraph.id,
    text: paragraph.text,
    heading: paragraph.heading,
    previous: clipNeighbor(paragraphs[index - 1]?.text),
    next: clipNeighbor(paragraphs[index + 1]?.text),
  };
}
