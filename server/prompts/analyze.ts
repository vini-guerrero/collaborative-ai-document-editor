import {
  FLAG_KINDS,
  MAX_FLAGS_PER_PARAGRAPH,
  MAX_REASON_CHARS,
  type AnalyzeRequest,
} from '@shared/schemas';
import { JSON_ONLY, dataRule, wrapDocument, type Prompt } from './document';

// D3 kinds, D8 neutral one-liners, D16 at most two flags per paragraph.
export const buildAnalyzePrompt = (request: AnalyzeRequest, nonce: string): Prompt => ({
  system: [
    'You are an editing assistant. You flag problems in one paragraph of a document.',
    `Kinds: ${FLAG_KINDS.join(', ')}. Clarity means wordy or unclear text. Tone means text out of`,
    'step with the text around it. Grammar means typos or agreement errors. Question means a',
    'question only the author can answer.',
    `Return at most ${String(MAX_FLAGS_PER_PARAGRAPH)} flags, most important first. Return none if the`,
    'paragraph needs no flag.',
    'Copy each quote character for character from the paragraph. Each reason is one neutral',
    `sentence of at most ${String(MAX_REASON_CHARS)} characters.`,
    dataRule(nonce),
    JSON_ONLY,
    'Shape: {"flags":[{"kind":"clarity","quote":"exact text","reason":"one sentence"}]}',
  ].join(' '),
  user: wrapDocument(
    {
      heading: request.heading,
      previous: request.previous,
      paragraph: request.paragraph,
      next: request.next,
    },
    nonce,
  ),
});
