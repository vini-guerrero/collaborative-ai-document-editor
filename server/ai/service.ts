import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import {
  FlagSchema,
  MAX_FLAGS_PER_PARAGRAPH,
  RestructureResponseSchema,
  RewriteResponseSchema,
  type AiRequest,
  type AiResponse,
  type AiTask,
  type AnalyzeRequest,
  type RestructureRequest,
  type RestructureResponse,
} from '@shared/schemas';
import { buildPrompt, RETRY_NOTE } from '../prompts';
import type { AIProvider, ProviderFailureKind } from './provider';
import { parseModelJson } from './parseModelJson';

export interface AiServiceDeps {
  provider: AIProvider;
  models: { analyze: string; rewrite: string; restructure: string };
  maxOutputTokens: number;
}

export interface ServiceError {
  readonly kind: ProviderFailureKind;
}

export type AiResult =
  | { readonly ok: true; readonly value: AiResponse<AiTask> }
  | { readonly ok: false; readonly error: ServiceError };

export interface AiService {
  run(request: AiRequest, signal: AbortSignal): Promise<AiResult>;
}

const NONCE_BYTES = 16;

// Production nonce source. Tests pass their own so prompts are deterministic.
const randomNonce = (): string => randomBytes(NONCE_BYTES).toString('hex');

// The model may return more flags than D16 allows; the service keeps the first two that
// match the paragraph. So the reply is checked against FlagSchema alone, not the 2-flag cap.
const ModelAnalyzeSchema = z.object({ flags: z.array(FlagSchema) }).strict();

const checkAnalyze = (
  request: AnalyzeRequest,
  value: unknown,
): AiResponse<'analyze'> | undefined => {
  const parsed = ModelAnalyzeSchema.safeParse(value);
  if (!parsed.success) {
    return undefined;
  }
  // A quote that is not verbatim in the paragraph would underline the wrong text (D2, T10).
  const flags = parsed.data.flags
    .filter((flag) => request.paragraph.includes(flag.quote))
    .slice(0, MAX_FLAGS_PER_PARAGRAPH);
  return { flags };
};

const isIndexInRange = (index: number, count: number): boolean => index < count;

// The operation must answer the requested action and point at sections that exist.
const checkRestructure = (
  request: RestructureRequest,
  value: unknown,
): RestructureResponse | undefined => {
  const parsed = RestructureResponseSchema.safeParse(value);
  if (!parsed.success || parsed.data.op !== request.action) {
    return undefined;
  }
  const operation = parsed.data;
  const count = request.sections.length;
  switch (operation.op) {
    case 'move':
      return isIndexInRange(operation.from, count) && isIndexInRange(operation.to, count)
        ? operation
        : undefined;
    case 'split':
      return isIndexInRange(operation.section, count) ? operation : undefined;
    case 'merge':
      return isIndexInRange(operation.first, count) &&
        isIndexInRange(operation.second, count) &&
        operation.first !== operation.second
        ? operation
        : undefined;
  }
};

// Returns the validated value, or undefined when the reply must be retried or given up.
// A rewrite identical to its quote is valid; the caller reads replacement === quote as no change.
const checkOutput = (request: AiRequest, text: string): AiResponse<AiTask> | undefined => {
  const reply = parseModelJson(text);
  if (!reply.ok) {
    return undefined;
  }
  switch (request.task) {
    case 'analyze':
      return checkAnalyze(request, reply.value);
    case 'rewrite': {
      const parsed = RewriteResponseSchema.safeParse(reply.value);
      return parsed.success ? parsed.data : undefined;
    }
    case 'restructure':
      return checkRestructure(request, reply.value);
  }
};

export const createAiService = (
  deps: AiServiceDeps,
  createNonce: () => string = randomNonce,
): AiService => ({
  run: async (request, signal) => {
    const prompt = buildPrompt(request, createNonce());
    const model = deps.models[request.task];
    const ask = (user: string) =>
      deps.provider.complete({
        model,
        system: prompt.system,
        user,
        maxOutputTokens: deps.maxOutputTokens,
        signal,
      });

    const first = await ask(prompt.user);
    if (!first.ok) {
      return { ok: false, error: { kind: first.kind } };
    }
    const firstValue = checkOutput(request, first.text);
    if (firstValue !== undefined) {
      return { ok: true, value: firstValue };
    }

    // One retry (T5). The corrective note carries no model output and no new document text.
    const retry = await ask(`${prompt.user}\n\n${RETRY_NOTE}`);
    if (!retry.ok) {
      return { ok: false, error: { kind: retry.kind } };
    }
    const retryValue = checkOutput(request, retry.text);
    if (retryValue === undefined) {
      return { ok: false, error: { kind: 'unavailable' } };
    }
    return { ok: true, value: retryValue };
  },
});
