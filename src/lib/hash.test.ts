import { describe, expect, it } from 'vitest';
import { fnv1a32 } from './hash';

const HEX_PATTERN = /^[0-9a-f]{8}$/;

// D4/T10: the hash keys the paragraph cache and the staleness check, so it must be deterministic.
describe('fnv1a32 (D4, T10)', () => {
  it('matches the published FNV-1a 32-bit vectors for ASCII', () => {
    expect(fnv1a32('')).toBe('811c9dc5');
    expect(fnv1a32('a')).toBe('e40c292c');
    expect(fnv1a32('foobar')).toBe('bf9cf968');
  });

  it('returns a fixed-width lowercase hex string', () => {
    expect(fnv1a32('')).toMatch(HEX_PATTERN);
    expect(fnv1a32('a paragraph of prose that is much longer than a few bytes')).toMatch(
      HEX_PATTERN,
    );
  });

  it('is deterministic for the same input', () => {
    const paragraph = 'The quick brown fox jumps over the lazy dog.';
    expect(fnv1a32(paragraph)).toBe(fnv1a32(paragraph));
  });

  it('gives different hashes for different inputs', () => {
    expect(fnv1a32('a')).not.toBe(fnv1a32('b'));
    expect(fnv1a32('foo bar')).not.toBe(fnv1a32('foo  bar'));
    expect(fnv1a32('Hello')).not.toBe(fnv1a32('hello'));
  });

  it('is stable for non-ASCII text (accents and emoji)', () => {
    const accented = 'café naïve résumé';
    const emoji = 'hello 🌍 world';
    expect(fnv1a32(accented)).toBe(fnv1a32('café naïve résumé'));
    expect(fnv1a32(emoji)).toBe(fnv1a32('hello 🌍 world'));
    expect(fnv1a32(accented)).toMatch(HEX_PATTERN);
    expect(fnv1a32(emoji)).toMatch(HEX_PATTERN);
  });

  it('distinguishes an accented letter from its base letter', () => {
    expect(fnv1a32('é')).not.toBe(fnv1a32('e'));
  });

  it('hashes code units, so precomposed and decomposed accents are different strings', () => {
    // U+00E9 is one code unit; e followed by U+0301 is two. Both are valid text, and
    // callers compare text as stored, so the hash follows the code units.
    expect(fnv1a32('é')).not.toBe(fnv1a32('é'));
  });
});
