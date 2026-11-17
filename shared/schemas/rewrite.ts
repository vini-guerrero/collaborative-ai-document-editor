import { z } from 'zod';
import {
  MAX_ANSWER_CHARS,
  MAX_INSTRUCTION_CHARS,
  MAX_PARAGRAPH_CHARS,
  ParagraphSchema,
} from './text';

// D6: tone and length dropdowns. "auto" and "same" mean the AI chooses or keeps the length.
export const TONES = ['auto', 'formal', 'casual', 'friendly', 'confident', 'neutral'] as const;
export const LENGTHS = ['shorter', 'longer', 'same'] as const;

// Runs on click (T5). `answer` carries the author's reply to a question flag (D3, D6, D10).
export const RewriteRequestSchema = z
  .object({
    task: z.literal('rewrite'),
    paragraph: ParagraphSchema,
    quote: z.string().min(1).max(MAX_PARAGRAPH_CHARS),
    tone: z.enum(TONES),
    length: z.enum(LENGTHS),
    instructions: z.string().max(MAX_INSTRUCTION_CHARS),
    answer: z.string().min(1).max(MAX_ANSWER_CHARS).optional(),
  })
  .strict();

export const RewriteResponseSchema = z
  .object({
    replacement: z.string().min(1).max(MAX_PARAGRAPH_CHARS),
  })
  .strict();

export type Tone = (typeof TONES)[number];
export type Length = (typeof LENGTHS)[number];
export type RewriteRequest = z.infer<typeof RewriteRequestSchema>;
export type RewriteResponse = z.infer<typeof RewriteResponseSchema>;
