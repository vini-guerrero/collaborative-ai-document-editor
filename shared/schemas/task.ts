import { z } from 'zod';
import { AnalyzeRequestSchema, AnalyzeResponseSchema } from './flag';
import { RestructureRequestSchema, RestructureResponseSchema } from './restructure';
import { RewriteRequestSchema, RewriteResponseSchema } from './rewrite';

// T5: every AI call is one of three tasks. The request union is keyed by `task`, and each
// task has exactly one response schema.
export const AI_TASKS = ['analyze', 'rewrite', 'restructure'] as const;
export const AiTaskSchema = z.enum(AI_TASKS);

export const AiRequestSchema = z.discriminatedUnion('task', [
  AnalyzeRequestSchema,
  RewriteRequestSchema,
  RestructureRequestSchema,
]);

export const AiResponseSchemas = {
  analyze: AnalyzeResponseSchema,
  rewrite: RewriteResponseSchema,
  restructure: RestructureResponseSchema,
} satisfies Record<z.infer<typeof AiTaskSchema>, z.ZodType>;

export type AiTask = z.infer<typeof AiTaskSchema>;
export type AiRequest = z.infer<typeof AiRequestSchema>;
export type AiResponse<T extends AiTask> = z.infer<(typeof AiResponseSchemas)[T]>;
