import { describe, expect, it } from 'vitest';
import { AnalyzeRequestSchema, AnalyzeResponseSchema, FlagSchema, MAX_REASON_CHARS } from './flag';

const validFlag = {
  kind: 'clarity',
  quote: 'in order to',
  reason: 'Wordy: same meaning in 2 words',
};

describe('FlagSchema (D3, D8)', () => {
  it('accepts a flag of each D3 kind', () => {
    for (const kind of ['clarity', 'tone', 'grammar', 'question']) {
      expect(FlagSchema.safeParse({ ...validFlag, kind }).success).toBe(true);
    }
  });

  it('rejects a kind outside D3', () => {
    expect(FlagSchema.safeParse({ ...validFlag, kind: 'structure-hint' }).success).toBe(false);
  });

  it('rejects an unknown field', () => {
    expect(FlagSchema.safeParse({ ...validFlag, id: 'x' }).success).toBe(false);
  });

  it('rejects an empty quote', () => {
    expect(FlagSchema.safeParse({ ...validFlag, quote: '' }).success).toBe(false);
  });

  it('accepts a reason of exactly MAX_REASON_CHARS and rejects one more character', () => {
    const atLimit = 'r'.repeat(MAX_REASON_CHARS);
    expect(FlagSchema.safeParse({ ...validFlag, reason: atLimit }).success).toBe(true);
    expect(FlagSchema.safeParse({ ...validFlag, reason: `${atLimit}r` }).success).toBe(false);
  });

  it('round-trips non-ASCII text unchanged', () => {
    const input = {
      kind: 'grammar',
      quote: 'café “naïve” 日本語 🙂',
      reason: 'Acento faltante: “cafe” → “café” (ñ, ü, ß)',
    };
    const parsed = FlagSchema.parse(input);
    expect(parsed).toEqual(input);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(input);
  });
});

describe('AnalyzeResponseSchema (D16)', () => {
  it('accepts up to 2 flags', () => {
    expect(AnalyzeResponseSchema.safeParse({ flags: [] }).success).toBe(true);
    expect(AnalyzeResponseSchema.safeParse({ flags: [validFlag, validFlag] }).success).toBe(true);
  });

  it('rejects 3 flags in one paragraph', () => {
    const result = AnalyzeResponseSchema.safeParse({ flags: [validFlag, validFlag, validFlag] });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields at the response level', () => {
    expect(AnalyzeResponseSchema.safeParse({ flags: [], extra: true }).success).toBe(false);
  });
});

describe('AnalyzeRequestSchema (D4)', () => {
  it('accepts a paragraph with optional context', () => {
    const result = AnalyzeRequestSchema.safeParse({
      task: 'analyze',
      paragraph: 'Some text.',
      heading: 'Intro',
      previous: 'Before.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty paragraph', () => {
    expect(AnalyzeRequestSchema.safeParse({ task: 'analyze', paragraph: '' }).success).toBe(false);
  });

  it('rejects unknown fields', () => {
    const input: unknown = { task: 'analyze', paragraph: 'x', model: 'gpt' };
    expect(AnalyzeRequestSchema.safeParse(input).success).toBe(false);
  });
});
