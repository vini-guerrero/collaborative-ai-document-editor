import type { Node } from '@tiptap/pm/model';

// The characters of one textblock and the document position of each character. Inline leaves
// such as hard breaks add no characters, so a quote is located in the text and mapped back to
// document positions without assuming one position per character.
export interface TextblockText {
  readonly text: string;
  readonly positions: readonly number[];
}

// `contentStart` is the document position just inside the textblock's opening token.
export function readTextblock(block: Node, contentStart: number): TextblockText {
  let text = '';
  const positions: number[] = [];
  block.descendants((node, pos) => {
    if (!node.isText) {
      return;
    }
    const chunk = node.text ?? '';
    text += chunk;
    for (let offset = 0; offset < chunk.length; offset += 1) {
      positions.push(contentStart + pos + offset);
    }
  });
  return { text, positions };
}
