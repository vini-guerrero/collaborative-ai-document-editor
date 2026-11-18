import { describe, expect, it } from 'vitest';
import { TONE_OPTIONS, instructionPlaceholder, isLength, isTone } from './refineOptions';

describe('refineOptions', () => {
  it('lists every tone with a label, in schema order', () => {
    expect(TONE_OPTIONS.map((option) => option.value)).toEqual([
      'auto',
      'formal',
      'casual',
      'friendly',
      'confident',
      'neutral',
    ]);
    expect(TONE_OPTIONS[0]?.label).toBe('Auto');
  });

  it('narrows only known tones and lengths', () => {
    expect(isTone('formal')).toBe(true);
    expect(isTone('shouty')).toBe(false);
    expect(isLength('shorter')).toBe(true);
    expect(isLength('tall')).toBe(false);
  });

  it('suggests a tone instruction unless the length is changing', () => {
    expect(instructionPlaceholder('same')).toMatch(/sound/);
    expect(instructionPlaceholder('shorter')).toMatch(/main point/);
  });
});
