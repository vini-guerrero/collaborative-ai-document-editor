import { z } from 'zod';
import { HeadingSchema, MAX_PARAGRAPH_CHARS, ParagraphSchema } from './text';

// D16: at most 2 flags per paragraph, so each underline reads like a colleague's note.
export const MAX_FLAGS_PER_PARAGRAPH = 2;
// D8: a flag reason is a neutral one-liner.
export const MAX_REASON_CHARS = 140;

// D3: clarity/wordiness, tone consistency, grammar/typos, and questions to the author.
export const FLAG_KINDS = ['clarity', 'tone', 'grammar', 'question'] as const;
export const FlagKindSchema = z.enum(FLAG_KINDS);

// The quote must be an exact substring of the paragraph. That check needs the paragraph,
// so the AI service performs it (T10); the schema only enforces a non-empty quote.
export const FlagSchema = z
  .object({
    kind: FlagKindSchema,
    quote: z.string().min(1).max(MAX_PARAGRAPH_CHARS),
    reason: z.string().min(1).max(MAX_REASON_CHARS),
  })
  .strict();

// analyze is cheap and returns flags only (T5). Neighbors give context (D4).
export const AnalyzeRequestSchema = z
  .object({
    task: z.literal('analyze'),
    paragraph: ParagraphSchema,
    heading: HeadingSchema.optional(),
    previous: ParagraphSchema.optional(),
    next: ParagraphSchema.optional(),
  })
  .strict();

export const AnalyzeResponseSchema = z
  .object({
    flags: z.array(FlagSchema).max(MAX_FLAGS_PER_PARAGRAPH),
  })
  .strict();

export type FlagKind = z.infer<typeof FlagKindSchema>;
export type Flag = z.infer<typeof FlagSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
