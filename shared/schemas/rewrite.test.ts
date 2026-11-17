import { describe, expect, it } from 'vitest';
import { MAX_PARAGRAPH_CHARS } from './text';
import { RewriteRequestSchema, RewriteResponseSchema } from './rewrite';

const validRequest = {
  task: 'rewrite',
  paragraph: 'We did it in order to win.',
  quote: 'in order to',
  tone: 'auto',
  length: 'shorter',
  instructions: '',
};

describe('RewriteRequestSchema (D6, D10)', () => {
  it('accepts a request with the D6 dropdown values', () => {
    expect(RewriteRequestSchema.safeParse(validRequest).success).toBe(true);
    expect(
      RewriteRequestSchema.safeParse({ ...validRequest, tone: 'formal', length: 'same' }).success,
    ).toBe(true);
  });

  it('rejects a tone outside D6', () => {
    expect(RewriteRequestSchema.safeParse({ ...validRequest, tone: 'angry' }).success).toBe(false);
  });

  it('rejects an empty quote', () => {
    expect(RewriteRequestSchema.safeParse({ ...validRequest, quote: '' }).success).toBe(false);
  });

  it('rejects an empty answer but accepts a missing one', () => {
    expect(RewriteRequestSchema.safeParse({ ...validRequest, answer: '' }).success).toBe(false);
    const withoutAnswer = RewriteRequestSchema.parse(validRequest);
    expect(withoutAnswer).not.toHaveProperty('answer');
  });

  it('accepts an answer to a question flag (D3)', () => {
    const result = RewriteRequestSchema.safeParse({
      ...validRequest,
      answer: 'The Q3 customers in Mexico.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a paragraph over MAX_PARAGRAPH_CHARS', () => {
    const paragraph = 'p'.repeat(MAX_PARAGRAPH_CHARS + 1);
    expect(RewriteRequestSchema.safeParse({ ...validRequest, paragraph }).success).toBe(false);
  });

  it('rejects unknown fields', () => {
    const input: unknown = { ...validRequest, temperature: 1 };
    expect(RewriteRequestSchema.safeParse(input).success).toBe(false);
  });

  it('round-trips non-ASCII text unchanged', () => {
    const input = {
      ...validRequest,
      paragraph: 'Ñandú cruzó la calle — “rápido” 🙂 日本語',
      quote: '“rápido”',
      instructions: 'más formal, ¿sí?',
    };
    expect(RewriteRequestSchema.parse(input)).toEqual(input);
  });
});

describe('RewriteResponseSchema', () => {
  it('accepts a non-empty replacement and rejects unknown fields', () => {
    expect(RewriteResponseSchema.safeParse({ replacement: 'Shorter text.' }).success).toBe(true);
    expect(RewriteResponseSchema.safeParse({ replacement: '' }).success).toBe(false);
    const input: unknown = { replacement: 'x', note: 'y' };
    expect(RewriteResponseSchema.safeParse(input).success).toBe(false);
  });
});
