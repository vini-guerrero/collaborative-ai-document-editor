import { z } from 'zod';
import { MAX_MESSAGE_CHARS } from './text';

// One error body for every failed AI call (T5). The server maps codes to HTTP statuses.
// out_of_credit drives the D14 status and the client stops calling until reload.
export const ERROR_CODES = [
  'out_of_credit',
  'unavailable',
  'invalid_request',
  'too_large',
] as const;
export const ErrorCodeSchema = z.enum(ERROR_CODES);

export const ErrorBodySchema = z
  .object({
    error: z
      .object({
        code: ErrorCodeSchema,
        message: z.string().min(1).max(MAX_MESSAGE_CHARS),
      })
      .strict(),
  })
  .strict();

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type ErrorBody = z.infer<typeof ErrorBodySchema>;
