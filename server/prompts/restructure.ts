import type { RestructureRequest } from '@shared/schemas';
import { JSON_ONLY, dataRule, wrapDocument, type Prompt } from './document';

// D10: the author picked one action at one section (D12). The reply is one operation (T5).
export const buildRestructurePrompt = (request: RestructureRequest, nonce: string): Prompt => ({
  system: [
    'You are an editing assistant. The author chose one restructuring action for a section.',
    `Action: ${request.action}. Section index: ${String(request.section)}.`,
    'Section indexes start at 0 and refer to the sections in the data.',
    'Reply with exactly one operation whose "op" equals the action:',
    '{"op":"move","from":0,"to":1} moves a section;',
    '{"op":"split","section":0,"atParagraph":1} splits a section before a paragraph index;',
    '{"op":"merge","first":0,"second":1} merges two different sections.',
    dataRule(nonce),
    JSON_ONLY,
  ].join(' '),
  user: wrapDocument({ sections: request.sections }, nonce),
});
