import { describe, expect, it } from 'vitest';
import { applyOperation, outline, NEW_SECTION_HEADING } from './sections';

// D10: three sections, with non-ASCII text and a trailing newline.
const DOC = '# Intro\n\nHello.\n\n## Body\n\nFirst para.\n\nSecond ünïcode.\n\n# End\n\nBye\n';
// A `#` line inside a fenced block is code, not a heading (D10).
const FENCED = '# Real\n\n```md\n# not a heading\n\nstill code\n```\n\n## Next\nbody\n';

describe('outline', () => {
  it('splits a document into heading sections with exact text (D10)', () => {
    expect(outline(DOC)).toEqual([
      { heading: 'Intro', level: 1, text: '# Intro\n\nHello.\n\n' },
      { heading: 'Body', level: 2, text: '## Body\n\nFirst para.\n\nSecond ünïcode.\n\n' },
      { heading: 'End', level: 1, text: '# End\n\nBye\n' },
    ]);
  });

  it('keeps text before the first heading as a section with no heading', () => {
    expect(outline('A\n\nB\n\n# Head\nx\n')).toEqual([
      { heading: null, level: null, text: 'A\n\nB\n\n' },
      { heading: 'Head', level: 1, text: '# Head\nx\n' },
    ]);
  });

  it('does not treat a # line inside fenced code as a heading (D10)', () => {
    expect(outline(FENCED).map((section) => section.heading)).toEqual(['Real', 'Next']);
  });

  it('does not treat #tag without a space as a heading', () => {
    expect(outline('#tag\nline\n')).toEqual([{ heading: null, level: null, text: '#tag\nline\n' }]);
  });

  it('returns one headingless section for a document with no headings', () => {
    expect(outline('just text\n')).toEqual([{ heading: null, level: null, text: 'just text\n' }]);
  });

  it('returns no sections for an empty document', () => {
    expect(outline('')).toEqual([]);
  });

  it.each([DOC, FENCED, 'a\n# b', '# A\r\nbody\r\n', '', 'Café\n\n# Naïve ✓\n'])(
    'joins the sections back to the original bytes (%j)',
    (markdown) => {
      expect(
        outline(markdown)
          .map((section) => section.text)
          .join(''),
      ).toBe(markdown);
    },
  );
});

describe('applyOperation move', () => {
  it('moves the first section to the end and keeps the other bytes (D10)', () => {
    expect(applyOperation(DOC, { op: 'move', from: 0, to: 2 })).toEqual({
      ok: true,
      markdown: '## Body\n\nFirst para.\n\nSecond ünïcode.\n\n# End\n\nBye\n# Intro\n\nHello.\n\n',
    });
  });

  it('moves the last section to the start', () => {
    expect(applyOperation(DOC, { op: 'move', from: 2, to: 0 })).toEqual({
      ok: true,
      markdown: '# End\n\nBye\n# Intro\n\nHello.\n\n## Body\n\nFirst para.\n\nSecond ünïcode.\n\n',
    });
  });

  it('returns noop when the section stays at the same position', () => {
    expect(applyOperation(DOC, { op: 'move', from: 1, to: 1 })).toEqual({
      ok: false,
      reason: 'noop',
    });
  });

  it('returns invalid_index for an out-of-range source or target', () => {
    expect(applyOperation(DOC, { op: 'move', from: 0, to: 3 })).toEqual({
      ok: false,
      reason: 'invalid_index',
    });
    expect(applyOperation(DOC, { op: 'move', from: 3, to: 0 })).toEqual({
      ok: false,
      reason: 'invalid_index',
    });
    expect(applyOperation(DOC, { op: 'move', from: -1, to: 0 })).toEqual({
      ok: false,
      reason: 'invalid_index',
    });
  });
});

describe('applyOperation split', () => {
  it('moves paragraph 1 and the rest into a new section (D10)', () => {
    expect(applyOperation(DOC, { op: 'split', section: 1, atParagraph: 1 })).toEqual({
      ok: true,
      markdown:
        '# Intro\n\nHello.\n\n## Body\n\nFirst para.\n\n## New section\n\nSecond ünïcode.\n\n# End\n\nBye\n',
    });
  });

  it('uses the default level when the section has no heading', () => {
    const preamble = 'A\n\nB\n\n# Head\nx\n';

    expect(applyOperation(preamble, { op: 'split', section: 0, atParagraph: 1 })).toEqual({
      ok: true,
      markdown: 'A\n\n## New section\n\nB\n\n# Head\nx\n',
    });
  });

  it('returns noop for paragraph 0', () => {
    expect(applyOperation(DOC, { op: 'split', section: 1, atParagraph: 0 })).toEqual({
      ok: false,
      reason: 'noop',
    });
  });

  it('returns invalid_index for a missing section or paragraph', () => {
    expect(applyOperation(DOC, { op: 'split', section: 3, atParagraph: 1 })).toEqual({
      ok: false,
      reason: 'invalid_index',
    });
    expect(applyOperation(DOC, { op: 'split', section: 1, atParagraph: 2 })).toEqual({
      ok: false,
      reason: 'invalid_index',
    });
  });

  it('keeps a fenced block with blank lines as one paragraph', () => {
    expect(applyOperation(FENCED, { op: 'split', section: 0, atParagraph: 1 })).toEqual({
      ok: false,
      reason: 'invalid_index',
    });
  });

  it('uses the placeholder heading text (D10)', () => {
    expect(NEW_SECTION_HEADING).toBe('New section');
  });
});

describe('applyOperation merge', () => {
  it('appends the second body to the first and drops the second heading (D10)', () => {
    expect(applyOperation(DOC, { op: 'merge', first: 0, second: 1 })).toEqual({
      ok: true,
      markdown: '# Intro\n\nHello.\n\n\nFirst para.\n\nSecond ünïcode.\n\n# End\n\nBye\n',
    });
  });

  it('merges the last two sections and keeps the trailing newline', () => {
    expect(applyOperation(DOC, { op: 'merge', first: 1, second: 2 })).toEqual({
      ok: true,
      markdown: '# Intro\n\nHello.\n\n## Body\n\nFirst para.\n\nSecond ünïcode.\n\n\nBye\n',
    });
  });

  it('returns invalid_index when the sections are not adjacent or in order', () => {
    expect(applyOperation(DOC, { op: 'merge', first: 0, second: 2 })).toEqual({
      ok: false,
      reason: 'invalid_index',
    });
    expect(applyOperation(DOC, { op: 'merge', first: 2, second: 1 })).toEqual({
      ok: false,
      reason: 'invalid_index',
    });
    expect(applyOperation(DOC, { op: 'merge', first: 0, second: 3 })).toEqual({
      ok: false,
      reason: 'invalid_index',
    });
  });
});

describe('applyOperation with a last section that has no trailing newline (D10)', () => {
  it('keeps every heading when the last section moves to the front', () => {
    const source = '# A\n\nText A.\n\n# B\n\nText B.';
    const result = applyOperation(source, { op: 'move', from: 1, to: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(outline(result.markdown).map((section) => section.heading)).toEqual(['B', 'A']);
    }
  });
});
