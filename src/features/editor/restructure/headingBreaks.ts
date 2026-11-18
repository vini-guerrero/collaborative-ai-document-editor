import { scanLines } from './lines';

// A heading must start its own block. `applyOperation` joins sections as they were, so a section
// that ends in a paragraph line (no trailing blank line) followed by a heading line would parse as
// paragraph text and the heading would be lost. A blank line goes before each heading that follows
// a non-blank line. Fenced code is opaque to scanLines, so `#` lines inside code are left alone.
export function separateHeadings(markdown: string): string {
  let joined = '';
  let previousBlank = true;
  for (const line of scanLines(markdown)) {
    if (line.heading !== null && !previousBlank) {
      joined += '\n';
    }
    joined += line.raw;
    previousBlank = line.blank;
  }
  return joined;
}
