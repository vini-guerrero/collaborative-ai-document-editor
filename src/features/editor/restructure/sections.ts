import type { RestructureOperation } from '@shared/schemas/restructure';
import { scanLines, textOf, type ScannedLine } from './lines';

// D10: a section is one ATX heading (or none, for text before the first heading) plus its body
// up to the next heading of any level. `text` is the exact source, so joining every section
// reproduces the document byte for byte, and untouched sections keep their bytes.
export interface Section {
  readonly heading: string | null;
  readonly level: number | null;
  readonly text: string;
}

export type OperationResult =
  { ok: true; markdown: string } | { ok: false; reason: 'invalid_index' | 'noop' };

// The heading a split creates. Its level copies the source section; text before the first
// heading has no level, so it gets this one.
export const NEW_SECTION_HEADING = 'New section';
const DEFAULT_SPLIT_LEVEL = 2;

const INVALID: OperationResult = { ok: false, reason: 'invalid_index' };
const NOOP: OperationResult = { ok: false, reason: 'noop' };

const isIndex = (index: number, length: number): boolean =>
  Number.isInteger(index) && index >= 0 && index < length;

// A section that ends the source has no trailing newline. When it moves into the middle, the next
// heading would glue onto its last line and be lost, so every part except the last gets one.
const joinSections = (sections: readonly Section[]): string =>
  sections
    .map((section, index) =>
      index < sections.length - 1 && !section.text.endsWith('\n')
        ? `${section.text}\n`
        : section.text,
    )
    .join('');

const applied = (sections: readonly Section[]): OperationResult => ({
  ok: true,
  markdown: joinSections(sections),
});

export function outline(markdown: string): Section[] {
  const sections: { heading: string | null; level: number | null; text: string }[] = [];
  for (const line of scanLines(markdown)) {
    appendLine(sections, line);
  }
  return sections;
}

// Appends one line to the section it belongs to. The first line of a document that is not a
// heading opens a section with no heading.
function appendLine(
  sections: { heading: string | null; level: number | null; text: string }[],
  line: ScannedLine,
): void {
  if (line.heading !== null) {
    sections.push({ heading: line.heading.title, level: line.heading.level, text: line.raw });
    return;
  }
  const current = sections[sections.length - 1];
  if (current === undefined) {
    sections.push({ heading: null, level: null, text: line.raw });
    return;
  }
  current.text += line.raw;
}

// Start line of each paragraph at or after `from`. A paragraph starts after a blank line
// (or at the first non-blank line), so a fenced block with blank lines stays one paragraph.
function paragraphStarts(lines: readonly ScannedLine[], from: number): number[] {
  const starts: number[] = [];
  let afterBlank = true;
  for (const [index, line] of lines.entries()) {
    if (index < from) continue;
    if (line.blank) {
      afterBlank = true;
      continue;
    }
    if (afterBlank) starts.push(index);
    afterBlank = false;
  }
  return starts;
}

export function applyOperation(markdown: string, operation: RestructureOperation): OperationResult {
  const sections = outline(markdown);
  switch (operation.op) {
    case 'move':
      return move(sections, operation.from, operation.to);
    case 'split':
      return split(sections, operation.section, operation.atParagraph);
    case 'merge':
      return merge(sections, operation.first, operation.second);
  }
}

// Removes the section at `from` and inserts it at final index `to`.
function move(sections: readonly Section[], from: number, to: number): OperationResult {
  const moved = sections[from];
  if (moved === undefined || !isIndex(to, sections.length)) return INVALID;
  if (from === to) return NOOP;
  const next = sections.filter((_, index) => index !== from);
  next.splice(to, 0, moved);
  return applied(next);
}

// Paragraph `atParagraph` and everything after it in the section move into a new section
// headed NEW_SECTION_HEADING. Paragraph 0 would leave the first part empty, so it is a noop.
function split(sections: readonly Section[], index: number, atParagraph: number): OperationResult {
  const section = sections[index];
  if (section === undefined) return INVALID;
  const lines = scanLines(section.text);
  const bodyFrom = lines[0]?.heading ? 1 : 0;
  const cut = paragraphStarts(lines, bodyFrom)[atParagraph];
  if (cut === undefined) return INVALID;
  if (atParagraph === 0) return NOOP;

  const level = section.level ?? DEFAULT_SPLIT_LEVEL;
  const before: Section = {
    heading: section.heading,
    level: section.level,
    text: textOf(lines.slice(0, cut)),
  };
  const after: Section = {
    heading: NEW_SECTION_HEADING,
    level,
    text: `${'#'.repeat(level)} ${NEW_SECTION_HEADING}\n\n${textOf(lines.slice(cut))}`,
  };
  return applied([...sections.slice(0, index), before, after, ...sections.slice(index + 1)]);
}

// Appends the body of `second` (its heading line dropped) to `first`. Only the next section
// can merge into this one, so the order of the document is kept.
function merge(sections: readonly Section[], first: number, second: number): OperationResult {
  const head = sections[first];
  const tail = sections[second];
  if (head === undefined || tail === undefined || second !== first + 1) return INVALID;
  const tailBody = textOf(scanLines(tail.text).slice(1));
  const merged: Section = {
    heading: head.heading,
    level: head.level,
    text: head.text + tailBody,
  };
  return applied([...sections.slice(0, first), merged, ...sections.slice(second + 1)]);
}
