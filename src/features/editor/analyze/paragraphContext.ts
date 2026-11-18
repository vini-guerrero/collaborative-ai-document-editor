import { fnv1a32 } from '@/lib/hash';
import { MAX_PARAGRAPH_CHARS } from '@shared/schemas';
import type { AiRequestOf } from '@/features/ai';

// D4: a paragraph shorter than this is too little prose for a useful flag.
export const MIN_PARAGRAPH_CHARS = 20;

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

// The identity of a paragraph's text: the cache key, the edited mark and the staleness check (T10).
// Only the paragraph's own text is hashed, so a changed neighbor never causes a new call.
// The flags plugin hashes the same characters (readTextblock joins text nodes, as textContent does),
// so hard breaks are left out on both sides and the two hashes always agree.
export const hashOfText = (text: string): string => fnv1a32(text);

// Empty neighbors are omitted: the request schema requires non-empty paragraphs (T5).
export const toAnalyzeRequest = (ctx: ParagraphContext): AiRequestOf<'analyze'> => ({
  task: 'analyze',
  paragraph: ctx.text,
  ...(ctx.heading === undefined ? {} : { heading: ctx.heading }),
  ...(isPresent(ctx.previous) ? { previous: ctx.previous } : {}),
  ...(isPresent(ctx.next) ? { next: ctx.next } : {}),
});
