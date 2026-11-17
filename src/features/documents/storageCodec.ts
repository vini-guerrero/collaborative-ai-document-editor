import type { z } from 'zod';
import type { Result, StoreError } from './DocumentStore';

// Quota names: standard, Firefox, and legacy numeric codes (Safari and older browsers).
const QUOTA_ERROR_NAMES: ReadonlySet<string> = new Set([
  'QuotaExceededError',
  'NS_ERROR_DOM_QUOTA_REACHED',
]);
const QUOTA_ERROR_CODES: ReadonlySet<number> = new Set([22, 1014]);

export const isQuotaError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const name: unknown = 'name' in error ? error.name : undefined;
  const code: unknown = 'code' in error ? error.code : undefined;
  return (
    (typeof name === 'string' && QUOTA_ERROR_NAMES.has(name)) ||
    (typeof code === 'number' && QUOTA_ERROR_CODES.has(code))
  );
};

// Parses at the boundary: a missing key is not-found; unparseable or invalid data is corrupt.
export const decode = <T>(schema: z.ZodType<T>, raw: string | null): Result<T, StoreError> => {
  if (raw === null) {
    return { ok: false, error: { kind: 'not-found' } };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: { kind: 'corrupt' } };
  }
  const result = schema.safeParse(parsed);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: { kind: 'corrupt' } };
};

// Quota becomes a result. Anything else rethrows: it is a bug or an environment fault.
export const writeJson = (
  storage: Pick<Storage, 'setItem'>,
  key: string,
  value: unknown,
): Result<void, StoreError> => {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error: unknown) {
    if (isQuotaError(error)) {
      return { ok: false, error: { kind: 'quota' } };
    }
    throw error;
  }
  return { ok: true, value: undefined };
};
