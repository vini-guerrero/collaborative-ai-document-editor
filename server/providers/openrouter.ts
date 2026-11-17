import { z } from 'zod';
import type { AIProvider, ProviderRequest, ProviderResult } from '../ai/provider';

// Plain fetch against the OpenRouter chat completions API, no SDK (T4). Every failure becomes a
// typed result: this adapter never throws and never puts the key, the prompt or the reply text
// into a result, so nothing secret can reach a log line through an error value.

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const HTTP_PAYMENT_REQUIRED = 402;
// Low, so the JSON reply is stable; not zero, so a retry (T5) can differ from a bad first reply.
const TEMPERATURE = 0.2;

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface OpenRouterOptions {
  apiKey: string;
  fetchImpl: FetchLike;
  baseUrl?: string;
}

const OUT_OF_CREDIT: ProviderResult = { ok: false, kind: 'out_of_credit' };
const UNAVAILABLE: ProviderResult = { ok: false, kind: 'unavailable' };

// Only the field we read is validated; other fields OpenRouter sends are ignored.
const ChatCompletionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

const buildBody = (request: ProviderRequest) => ({
  model: request.model,
  messages: [
    { role: 'system', content: request.system },
    { role: 'user', content: request.user },
  ],
  max_tokens: request.maxOutputTokens,
  temperature: TEMPERATURE,
});

// A body that is not JSON or lacks the expected shape is an expected failure, so it returns
// undefined. The parse error is dropped on purpose: its message can quote part of the body.
const readCompletionText = async (response: Response): Promise<string | undefined> => {
  const body: unknown = await response.json().catch(() => undefined);
  const parsed = ChatCompletionSchema.safeParse(body);
  return parsed.success ? parsed.data.choices[0]?.message.content : undefined;
};

const toResult = async (response: Response): Promise<ProviderResult> => {
  if (response.status === HTTP_PAYMENT_REQUIRED) {
    return OUT_OF_CREDIT;
  }
  if (!response.ok) {
    return UNAVAILABLE;
  }
  const text = await readCompletionText(response);
  return text === undefined ? UNAVAILABLE : { ok: true, text };
};

export const createOpenRouterProvider = (options: OpenRouterOptions): AIProvider => {
  const url = `${options.baseUrl ?? DEFAULT_BASE_URL}/chat/completions`;

  return {
    complete: async (request) => {
      let response: Response;
      try {
        response = await options.fetchImpl(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildBody(request)),
          signal: request.signal,
        });
      } catch {
        // Network failure, DNS error, or the abort signal fired (timeout or client gone).
        return UNAVAILABLE;
      }
      try {
        return await toResult(response);
      } catch {
        // The body stream failed mid-read (for example, aborted while reading).
        return UNAVAILABLE;
      }
    },
  };
};
