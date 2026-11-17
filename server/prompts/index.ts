import type { AiRequest } from '@shared/schemas';
import { buildAnalyzePrompt } from './analyze';
import { buildRestructurePrompt } from './restructure';
import { buildRewritePrompt } from './rewrite';
import type { Prompt } from './document';

export type { Prompt } from './document';
export { RETRY_NOTE } from './document';

export const buildPrompt = (request: AiRequest, nonce: string): Prompt => {
  switch (request.task) {
    case 'analyze':
      return buildAnalyzePrompt(request, nonce);
    case 'rewrite':
      return buildRewritePrompt(request, nonce);
    case 'restructure':
      return buildRestructurePrompt(request, nonce);
  }
};
