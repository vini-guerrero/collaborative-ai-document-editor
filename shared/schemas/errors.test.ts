import { describe, expect, it } from 'vitest';
import { ErrorBodySchema } from './errors';

describe('ErrorBodySchema (T5, D14)', () => {
  it('accepts each error code in the single body shape', () => {
    for (const code of ['out_of_credit', 'unavailable', 'invalid_request', 'too_large']) {
      const result = ErrorBodySchema.safeParse({ error: { code, message: 'AI is unavailable.' } });
      expect(result.success).toBe(true);
    }
  });

  it('rejects a code outside the contract', () => {
    const input = { error: { code: 'timeout', message: 'Too slow.' } };
    expect(ErrorBodySchema.safeParse(input).success).toBe(false);
  });

  it('rejects unknown fields, including a stack trace', () => {
    const input: unknown = {
      error: { code: 'unavailable', message: 'Failed.', stack: 'at line 1' },
    };
    expect(ErrorBodySchema.safeParse(input).success).toBe(false);
    const topLevel: unknown = { error: { code: 'unavailable', message: 'x' }, requestId: 'r' };
    expect(ErrorBodySchema.safeParse(topLevel).success).toBe(false);
  });

  it('rejects an empty message', () => {
    const input = { error: { code: 'unavailable', message: '' } };
    expect(ErrorBodySchema.safeParse(input).success).toBe(false);
  });
});
