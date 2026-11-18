import type { Node } from '@tiptap/pm/model';

// The heading node type in the editor schema (StarterKit).
export const HEADING_NODE = 'heading';

export interface DocBlock {
  // Document position before the block, and the block itself.
  readonly pos: number;
  readonly node: Node;
}

// The top-level blocks of each section, mirroring outline(): a section starts at a heading, and
// text before the first heading forms a section of its own. Block order gives paragraph order.
export function docSections(doc: Node): DocBlock[][] {
  const sections: DocBlock[][] = [];
  doc.forEach((node, pos) => {
    const block: DocBlock = { pos, node };
    const current = sections[sections.length - 1];
    if (current === undefined || node.type.name === HEADING_NODE) {
      sections.push([block]);
    } else {
      current.push(block);
    }
  });
  return sections;
}

// The blocks after the heading, which is what a split cuts into paragraphs.
export function bodyBlocksOf(section: readonly DocBlock[]): readonly DocBlock[] {
  const first = section[0];
  return first?.node.type.name === HEADING_NODE ? section.slice(1) : section;
}
