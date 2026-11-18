import type { Node } from '@tiptap/pm/model';
import {
  MAX_HEADING_CHARS,
  MAX_SECTION_CHARS,
  MAX_SECTIONS,
  type Section as RequestSection,
} from '@shared/schemas';
import type { RestructureAction } from '@shared/schemas/restructure';
import { bodyBlocksOf, docSections } from './docSections';
import type { Section } from './sections';

export type RequestSectionsFailure = 'empty' | 'too_long' | 'nothing_to_do';

export type RequestSections =
  | { readonly ok: true; readonly sections: RequestSection[] }
  | { readonly ok: false; readonly reason: RequestSectionsFailure };

// The text after the heading line. Opening text (no heading) is all body.
function bodyOf(section: Section): string {
  if (section.heading === null) {
    return section.text;
  }
  const newline = section.text.indexOf('\n');
  return newline === -1 ? '' : section.text.slice(newline + 1);
}

// D10: the outline as the restructure contract wants it (T5 bounds). Opening text has no heading,
// so its heading is empty text, which the schema allows.
export function requestSectionsOf(sections: readonly Section[]): RequestSections {
  if (sections.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (sections.length > MAX_SECTIONS) {
    return { ok: false, reason: 'too_long' };
  }
  const mapped = sections.map((section): RequestSection => ({
    heading: (section.heading ?? '').slice(0, MAX_HEADING_CHARS),
    body: bodyOf(section),
  }));
  if (mapped.some((section) => section.body.length > MAX_SECTION_CHARS)) {
    return { ok: false, reason: 'too_long' };
  }
  return { ok: true, sections: mapped };
}

// D10: the section that holds the caret, by its index in the outline. Falls back to the first.
export function sectionIndexAt(doc: Node, pos: number): number {
  const index = docSections(doc).findIndex((blocks) =>
    blocks.some((block) => pos >= block.pos && pos < block.pos + block.node.nodeSize),
  );
  return Math.max(index, 0);
}

// D10: whether the action has any valid operation. Move and merge need two sections; split needs
// the caret's section to hold at least two paragraphs. Asking the AI otherwise cannot succeed, and
// its failed reply would show as an outage (D14).
export function isActionPossible(doc: Node, action: RestructureAction, section: number): boolean {
  const sections = docSections(doc);
  if (action !== 'split') {
    return sections.length >= 2;
  }
  const blocks = sections[section];
  return blocks !== undefined && bodyBlocksOf(blocks).length >= 2;
}
