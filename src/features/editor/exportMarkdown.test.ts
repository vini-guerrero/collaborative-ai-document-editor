import { describe, expect, it } from 'vitest';
import { markdownFilename } from './exportMarkdown';

describe('markdownFilename', () => {
  it('turns a title into a hyphenated .md name', () => {
    expect(markdownFilename('Launch Plan: Q1 / 2026')).toBe('launch-plan-q1-2026.md');
  });

  it('falls back to a default for an empty or symbol-only title', () => {
    expect(markdownFilename('   ')).toBe('untitled-document.md');
    expect(markdownFilename('???')).toBe('untitled-document.md');
  });

  it('keeps letters from other scripts and caps the length', () => {
    expect(markdownFilename('Café résumé')).toBe('café-résumé.md');
    expect(markdownFilename('a'.repeat(200)).length).toBe(80 + '.md'.length);
  });
});
