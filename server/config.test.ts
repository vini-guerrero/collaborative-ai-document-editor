import { describe, expect, it } from 'vitest';
import { parseConfig } from './config';

const SECRET_KEY = 'sk-or-v1-test-secret-7c1f9e';

const validEnv: Record<string, string | undefined> = {
  OPENROUTER_API_KEY: SECRET_KEY,
  MODEL_ANALYZE: 'test/analyze-model',
  MODEL_REWRITE: 'test/rewrite-model',
  MODEL_RESTRUCTURE: 'test/restructure-model',
  MAX_INPUT_CHARS: '20000',
  PORT: '9000',
};

const errorMessageOf = (env: Record<string, string | undefined>): string => {
  try {
    parseConfig(env);
  } catch (error: unknown) {
    return error instanceof Error ? error.message : '';
  }
  return '';
};

describe('parseConfig', () => {
  it('parses a valid environment into typed config (T7)', () => {
    const config = parseConfig(validEnv);

    expect(config).toEqual({
      OPENROUTER_API_KEY: SECRET_KEY,
      MODEL_ANALYZE: 'test/analyze-model',
      MODEL_REWRITE: 'test/rewrite-model',
      MODEL_RESTRUCTURE: 'test/restructure-model',
      MAX_INPUT_CHARS: 20000,
      PORT: 9000,
    });
  });

  it('names the invalid key and never prints a valid secret (T7, T4)', () => {
    const env = { ...validEnv, MAX_INPUT_CHARS: 'abc' };

    const message = errorMessageOf(env);

    expect(message).toContain('MAX_INPUT_CHARS');
    expect(message).not.toContain(SECRET_KEY);
  });

  it('names a missing key and never prints a secret value (T7, T4)', () => {
    const env = { ...validEnv, MODEL_ANALYZE: undefined };

    const message = errorMessageOf(env);

    expect(message).toContain('MODEL_ANALYZE');
    expect(message).not.toContain(SECRET_KEY);
  });

  it('treats a whitespace-only API key as missing (T4)', () => {
    const message = errorMessageOf({ ...validEnv, OPENROUTER_API_KEY: '   ' });

    expect(message).toContain('OPENROUTER_API_KEY');
  });

  it('rejects a PORT outside 1-65535 and names only the key (T7)', () => {
    expect(errorMessageOf({ ...validEnv, PORT: '70000' })).toContain('PORT');
    expect(errorMessageOf({ ...validEnv, PORT: '0' })).toContain('PORT');
  });

  it('rejects a MAX_INPUT_CHARS above the upper bound (T7)', () => {
    expect(errorMessageOf({ ...validEnv, MAX_INPUT_CHARS: '200001' })).toContain('MAX_INPUT_CHARS');
  });

  it('defaults PORT to 8787 when it is unset or empty (T7)', () => {
    expect(parseConfig({ ...validEnv, PORT: undefined }).PORT).toBe(8787);
    expect(parseConfig({ ...validEnv, PORT: '' }).PORT).toBe(8787);
  });
});
