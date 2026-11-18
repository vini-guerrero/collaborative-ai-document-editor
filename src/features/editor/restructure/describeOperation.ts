import type { RestructureOperation } from '@shared/schemas/restructure';
import type { Section } from './sections';
import { landingSectionIndex } from './landing';

// Shown for a section with no heading: the text before the first heading.
export const OPENING_TITLE = 'Opening text';
const FALLBACK_SUMMARY = 'Restructure the document';

export function sectionTitle(section: Section): string {
  return section.heading ?? OPENING_TITLE;
}

// The suggestion in words (D11). Text only: headings come from the document, so they are
// rendered as text and never as markup (T10). An index the outline lacks gets a generic summary.
export function describeOperation(
  sections: readonly Section[],
  operation: RestructureOperation,
): string {
  switch (operation.op) {
    case 'move':
      return describeMove(sections, operation.from, operation.to);
    case 'split':
      return describeSplit(sections, operation.section, operation.atParagraph);
    case 'merge':
      return describeMerge(sections, operation.first, operation.second);
  }
}

function describeMove(sections: readonly Section[], from: number, to: number): string {
  const moved = sections[from];
  if (moved === undefined) return FALLBACK_SUMMARY;
  const title = sectionTitle(moved);
  const landing = landingSectionIndex(sections.length, from, to);
  if (landing === null) return `Move "${title}" to the end`;
  const before = sections[landing];
  if (before === undefined) return FALLBACK_SUMMARY;
  return `Move "${title}" above "${sectionTitle(before)}"`;
}

function describeSplit(sections: readonly Section[], index: number, atParagraph: number): string {
  const section = sections[index];
  if (section === undefined) return FALLBACK_SUMMARY;
  return `Split "${sectionTitle(section)}" after paragraph ${String(atParagraph)}`;
}

function describeMerge(sections: readonly Section[], first: number, second: number): string {
  const head = sections[first];
  const tail = sections[second];
  if (head === undefined || tail === undefined) return FALLBACK_SUMMARY;
  return `Merge "${sectionTitle(head)}" and "${sectionTitle(tail)}"`;
}
