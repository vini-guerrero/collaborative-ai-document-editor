import { fnv1a32 } from '@/lib/hash';
import { MAX_PARAGRAPH_CHARS } from '@shared/schemas';
import type { AiRequestOf } from '@/features/ai';

// D4: a paragraph shorter than this is too little prose for a useful flag.
export const MIN_PARAGRAPH_CHARS = 20;
// Marks an absent neighbor in the cache key, so "no heading" differs from an empty heading.
const ABSENT_FIELD_KEY = '-';

// One paragraph plus the context the AI needs (D4). Neighbors are optional; the editor fills them.
export interface ParagraphContext {
  id: string;
  text: string;
  heading?: string | undefined;
  previous?: string | undefined;
  next?: string | undefined;
}

const isPresent = (value: string | undefined): value is string =>
  value !== undefined && value.length > 0;

// Empty or whitespace-only paragraphs and fragments are not worth a call (D4, T5 bounds).
export const isAnalyzable = (ctx: ParagraphContext): boolean => {
  const trimmedLength = ctx.text.trim().length;
  return trimmedLength >= MIN_PARAGRAPH_CHARS && ctx.text.length <= MAX_PARAGRAPH_CHARS;
};

// The paragraph hash is the staleness key (T10): a response is only shown for this exact text.
export const textHashOf = (ctx: ParagraphContext): string => fnv1a32(ctx.text);

// Heading and neighbors change what the AI would say, so they belong in the cache key too.
const fieldKeyOf = (value: string | undefined): string =>
  value === undefined ? ABSENT_FIELD_KEY : fnv1a32(value);

export const cacheKeyOf = (ctx: ParagraphContext): string =>
  [textHashOf(ctx), fieldKeyOf(ctx.heading), fieldKeyOf(ctx.previous), fieldKeyOf(ctx.next)].join(
    '.',
  );

// Empty neighbors are omitted: the request schema requires non-empty paragraphs (T5).
export const toAnalyzeRequest = (ctx: ParagraphContext): AiRequestOf<'analyze'> => ({
  task: 'analyze',
  paragraph: ctx.text,
  ...(ctx.heading === undefined ? {} : { heading: ctx.heading }),
  ...(isPresent(ctx.previous) ? { previous: ctx.previous } : {}),
  ...(isPresent(ctx.next) ? { next: ctx.next } : {}),
});
