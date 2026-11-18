import { z } from 'zod';
import type { AIProvider, ProviderRequest, ProviderResult } from '../ai/provider';

// Plain fetch against the OpenRouter chat completions API, no SDK (T4). Every failure becomes a
// typed result: this adapter never throws and never puts the key, the prompt or the reply text
// into a result, so nothing secret can reach a log line through an error value.

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const HTTP_PAYMENT_REQUIRED = 402;
// Low, so the JSON reply is stable; not zero, so a retry (T5) can differ from a bad first reply.
const TEMPERATURE = 0.2;
// A chat reply for one paragraph is far below this; a larger body is treated as a failure (T5, T7).
const MAX_RESPONSE_BYTES = 256 * 1024;

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
  // Reasoning models spend max_tokens thinking and can return an empty reply (looks like an outage).
  // Low effort keeps the budget for the JSON answer; models without reasoning ignore the field.
  reasoning: { effort: 'low' },
});

// Releases the socket for a body we will not read. Cancel fails only when the stream is already
// closed or errored, and then there is nothing left to release.
const releaseBody = async (response: Response): Promise<void> => {
  try {
    await response.body?.cancel();
  } catch {
    // Already closed or errored: nothing to release.
  }
};

// A missing or non-numeric Content-Length is not trusted; only a declared size within the cap passes.
const declaredLengthRejected = (response: Response): boolean => {
  const header = response.headers.get('content-length');
  if (header === null) {
    return false;
  }
  const declared = Number(header);
  return !Number.isFinite(declared) || declared > MAX_RESPONSE_BYTES;
};

const cancelReader = async (reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> => {
  try {
    await reader.cancel();
  } catch {
    // Already errored: nothing left to release.
  }
};

// Reads the body chunk by chunk and stops as soon as the byte count passes the cap, so an
// oversize reply is never buffered whole. Chunked replies without Content-Length are read this way.
// Returns undefined for a missing body or an oversize one; a read or decode error throws.
const readBoundedText = async (response: Response): Promise<string | undefined> => {
  const stream = response.body;
  if (stream === null) {
    return undefined;
  }
  const reader = stream.getReader();
  // Fatal decoding: invalid UTF-8 throws and becomes unavailable instead of replacement characters.
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const parts: string[] = [];
  let totalBytes = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      totalBytes += result.value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        return undefined;
      }
      parts.push(decoder.decode(result.value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join('');
  } finally {
    // Cancel is a no-op on a finished stream; on an early exit it closes the socket.
    await cancelReader(reader);
    reader.releaseLock();
  }
};

// A body that is not JSON or lacks the expected shape is an expected failure, so it returns
// undefined. Parse errors are dropped on purpose: their messages can quote the body.
const parseCompletionText = (raw: string): string | undefined => {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const parsed = ChatCompletionSchema.safeParse(body);
  return parsed.success ? parsed.data.choices[0]?.message.content : undefined;
};

const toResult = async (response: Response): Promise<ProviderResult> => {
  if (!response.ok) {
    const failure = response.status === HTTP_PAYMENT_REQUIRED ? OUT_OF_CREDIT : UNAVAILABLE;
    await releaseBody(response);
    return failure;
  }
  if (declaredLengthRejected(response)) {
    await releaseBody(response);
    return UNAVAILABLE;
  }
  const raw = await readBoundedText(response);
  const text = raw === undefined ? undefined : parseCompletionText(raw);
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
