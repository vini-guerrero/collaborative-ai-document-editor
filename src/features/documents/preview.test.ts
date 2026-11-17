import { describe, expect, it } from 'vitest';
import { createPreview } from './preview';

const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}';
const FLAG = '\u{1F1FA}\u{1F1F8}';

describe('createPreview', () => {
  it('returns an empty string for empty input (H4)', () => {
    expect(createPreview('')).toBe('');
  });

  it('strips heading markers (H4)', () => {
    expect(createPreview('# Title\n## Subtitle')).toBe('Title Subtitle');
  });

  it('strips emphasis and bold markers (H4)', () => {
    expect(createPreview('Some **bold**, *em*, __strong__ and _soft_ text.')).toBe(
      'Some bold, em, strong and soft text.',
    );
  });

  it('keeps underscores inside words (H4)', () => {
    expect(createPreview('use snake_case_name here')).toBe('use snake_case_name here');
  });

  it('strips inline code backticks (H4)', () => {
    expect(createPreview('call `parse()` now')).toBe('call parse() now');
  });

  it('turns a link into its text (H4)', () => {
    expect(createPreview('see [the docs](https://example.com) today')).toBe('see the docs today');
  });

  it('leaves link text longer than 200 characters unstripped (H4, perf bound)', () => {
    const longText = `[${'x'.repeat(300)}](http://a.test)`;

    expect(createPreview(longText).startsWith('[')).toBe(true);
  });

  it('strips list bullets and numbers (H4)', () => {
    expect(createPreview('- first\n* second\n1. third')).toBe('first second third');
  });

  it('strips blockquote markers (H4)', () => {
    expect(createPreview('> quoted line')).toBe('quoted line');
  });

  it('removes fence lines and keeps the code text (H4)', () => {
    expect(createPreview('```ts\nconst a = 1;\n```\nafter')).toBe('const a = 1; after');
  });

  it('removes thematic breaks (H4)', () => {
    expect(createPreview('above\n\n---\n\nbelow')).toBe('above below');
    expect(createPreview('a\n***\nb')).toBe('a b');
    expect(createPreview('a\n___\nb')).toBe('a b');
  });

  it('strips HTML tags and keeps their text (H4, plain text only)', () => {
    expect(createPreview('a <b>bold</b> <br/> text')).toBe('a bold text');
  });

  it('collapses whitespace and newlines to single spaces (H4)', () => {
    expect(createPreview('  a \n\n\t b  ')).toBe('a b');
  });

  it('leaves text at exactly 160 characters unchanged (H4)', () => {
    const text = 'a'.repeat(160);

    expect(createPreview(text)).toBe(text);
  });

  it('truncates to 160 characters including the ellipsis (H4)', () => {
    const preview = createPreview('a'.repeat(200));

    expect(Array.from(preview)).toHaveLength(160);
    expect(preview.endsWith('…')).toBe(true);
  });

  it('keeps ZWJ emoji sequences whole at the cut (H4, non-ASCII)', () => {
    const preview = createPreview(FAMILY.repeat(200));

    expect(preview).toBe(`${FAMILY.repeat(159)}…`);
  });

  it('keeps flag pairs whole at the cut (H4, non-ASCII)', () => {
    const preview = createPreview(FLAG.repeat(200));

    expect(preview).toBe(`${FLAG.repeat(159)}…`);
  });

  it('honors a custom maxChars and counts the ellipsis within it (H4)', () => {
    expect(createPreview('abcdefghij', 5)).toBe('abcd…');
  });

  it('handles a pathological bracket input within a tight time bound (T7, perf)', () => {
    const started = performance.now();

    createPreview('['.repeat(200_000));

    expect(performance.now() - started).toBeLessThan(200);
  });
});
