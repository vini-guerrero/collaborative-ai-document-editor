import type { RewriteRequest } from '@shared/schemas';
import { JSON_ONLY, dataRule, wrapDocument, type Prompt } from './document';

// D6: tone and length come from dropdowns, so they are enum values and safe to state inline.
export const buildRewritePrompt = (request: RewriteRequest, nonce: string): Prompt => ({
  system: [
    'You are an editing assistant. Rewrite only the quoted text inside the paragraph.',
    `Requested tone: ${request.tone} (auto means choose the tone that fits the paragraph).`,
    `Requested length: ${request.length} (shorter, longer, or same).`,
    'Keep the meaning unless the author instructions or answer change it.',
    'Return only the replacement for the quote, not the whole paragraph.',
    dataRule(nonce),
    JSON_ONLY,
    'Shape: {"replacement":"new text"}',
  ].join(' '),
  user: wrapDocument(
    {
      paragraph: request.paragraph,
      quote: request.quote,
      instructions: request.instructions,
      answer: request.answer,
    },
    nonce,
  ),
});
