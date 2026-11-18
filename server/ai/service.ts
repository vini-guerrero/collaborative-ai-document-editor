import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import {
  FlagSchema,
  MAX_FLAGS_PER_PARAGRAPH,
  MAX_REASON_CHARS,
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

// The reply must be an object with a flags array. Each flag is then judged on its own: one bad
// flag (a reason over the limit, an unknown kind) must not discard the good ones, or a short outage
// of quality would show as an AI outage (D14). Over-long reasons are shortened, not rejected, since
// the limit is a display rule (D8) and the model's wording is otherwise fine.
const ModelAnalyzeSchema = z.object({ flags: z.array(z.unknown()) }).strict();
const REASON_ELLIPSIS = '…';

const shortenReason = (raw: unknown): unknown => {
  if (typeof raw !== 'object' || raw === null || !('reason' in raw)) {
    return raw;
  }
  const { reason } = raw;
  if (typeof reason !== 'string' || reason.length <= MAX_REASON_CHARS) {
    return raw;
  }
  return {
    ...raw,
    reason: `${reason.slice(0, MAX_REASON_CHARS - REASON_ELLIPSIS.length).trimEnd()}${REASON_ELLIPSIS}`,
  };
};

const checkAnalyze = (
  request: AnalyzeRequest,
  value: unknown,
): AiResponse<'analyze'> | undefined => {
  const parsed = ModelAnalyzeSchema.safeParse(value);
  if (!parsed.success) {
    return undefined;
  }
  // A quote that is not verbatim in the paragraph would underline the wrong text (D2, T10).
  // A quote that appears more than once keeps every match here; the client anchors the first one.
  const flags = parsed.data.flags
    .map((raw) => FlagSchema.safeParse(shortenReason(raw)))
    .flatMap((flag) => (flag.success ? [flag.data] : []))
    .filter((flag) => request.paragraph.includes(flag.quote))
    .slice(0, MAX_FLAGS_PER_PARAGRAPH);
  return { flags };
};

const isIndexInRange = (index: number, count: number): boolean => index < count;

// A split point is a paragraph after the first, so it needs 1 <= atParagraph < count. Paragraphs
// are counted by splitting the body on blank lines. This is approximate: blank lines inside a
// code fence or a list split a paragraph in two, so the count can be high there.
const countParagraphs = (body: string): number =>
  body.split(/\n\s*\n/).filter((paragraph) => paragraph.trim() !== '').length;

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
      return isIndexInRange(operation.from, count) &&
        isIndexInRange(operation.to, count) &&
        operation.from !== operation.to
        ? operation
        : undefined;
    case 'split': {
      const body = request.sections[operation.section]?.body;
      if (body === undefined) {
        return undefined;
      }
      return operation.atParagraph >= 1 && operation.atParagraph < countParagraphs(body)
        ? operation
        : undefined;
    }
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
