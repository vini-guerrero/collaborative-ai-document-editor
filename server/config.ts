import { z } from 'zod';

// An empty line in .env (KEY=) means "not set", so it fails or falls back like a missing key (T7).
const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);

const MAX_INPUT_CHARS_LIMIT = 200_000;
const MAX_PORT = 65_535;
const DEFAULT_PORT = 8787;

const trimmedText = z.string().trim().min(1);

// Numeric keys arrive as strings: digits only, then converted and range-checked (T7).
const wholeNumber = (max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/)
    .transform((value) => Number(value))
    .pipe(z.number().int().min(1).max(max));

const configSchema = z.object({
  OPENROUTER_API_KEY: trimmedText,
  MODEL_ANALYZE: trimmedText,
  MODEL_REWRITE: trimmedText,
  MODEL_RESTRUCTURE: trimmedText,
  MAX_INPUT_CHARS: z.preprocess(emptyToUndefined, wholeNumber(MAX_INPUT_CHARS_LIMIT)),
  PORT: z.preprocess(emptyToUndefined, wholeNumber(MAX_PORT).default(DEFAULT_PORT)),
});

export type Config = z.infer<typeof configSchema>;

// Fails fast at startup (T7). The error names the offending keys only, never their values,
// so a secret such as OPENROUTER_API_KEY cannot leak into logs.
export const parseConfig = (env: Record<string, string | undefined>): Config => {
  const result = configSchema.safeParse(env);
  if (result.success) {
    return result.data;
  }
  const keys = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
  throw new Error(`Invalid configuration for environment keys: ${keys.join(', ')}`);
};
