import { z } from 'zod';
import { HeadingSchema, MAX_SECTION_CHARS, MAX_SECTIONS } from './text';

// D10: the user chooses move, split or merge from the slash menu (D12).
export const RESTRUCTURE_ACTIONS = ['move', 'split', 'merge'] as const;
export const RestructureActionSchema = z.enum(RESTRUCTURE_ACTIONS);

const SectionIndexSchema = z.number().int().nonnegative();

export const SectionSchema = z
  .object({
    heading: HeadingSchema,
    body: z.string().max(MAX_SECTION_CHARS),
  })
  .strict();

// `section` is the index of the block where the `/` was typed (D12).
export const RestructureRequestSchema = z
  .object({
    task: z.literal('restructure'),
    action: RestructureActionSchema,
    section: SectionIndexSchema,
    sections: z.array(SectionSchema).min(1).max(MAX_SECTIONS),
  })
  .strict()
  .refine((request) => request.section < request.sections.length, {
    path: ['section'],
    message: 'section must index into sections',
  });

// The response is one operation that references section indexes (T5). The AI service
// checks that each index is in range for the request it answers.
export const RestructureOperationSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('move'), from: SectionIndexSchema, to: SectionIndexSchema }).strict(),
  z
    .object({
      op: z.literal('split'),
      section: SectionIndexSchema,
      atParagraph: SectionIndexSchema,
    })
    .strict(),
  z
    .object({ op: z.literal('merge'), first: SectionIndexSchema, second: SectionIndexSchema })
    .strict(),
]);

export const RestructureResponseSchema = RestructureOperationSchema;

export type RestructureAction = z.infer<typeof RestructureActionSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type RestructureRequest = z.infer<typeof RestructureRequestSchema>;
export type RestructureOperation = z.infer<typeof RestructureOperationSchema>;
export type RestructureResponse = z.infer<typeof RestructureResponseSchema>;
