import { describe, expect, it } from 'vitest';
import { flattenReplacement } from './replacementText';

// T2, T10: a replacement is one paragraph, so line breaks become spaces before it is shown or saved.
describe('flattenReplacement', () => {
  it('turns line breaks and their surrounding spaces into single spaces', () => {
    expect(flattenReplacement('one\n\n  two\nthree')).toBe('one two three');
  });

  it('keeps plain text that starts with Markdown syntax as text', () => {
    expect(flattenReplacement('line\n# x')).toBe('line # x');
  });
});
