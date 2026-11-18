import { AiRequestSchema, AiResponseSchemas, ErrorBodySchema } from '@shared/schemas';
import type { AiRequest, AiResponse, AiTask, ErrorCode } from '@shared/schemas';

// The browser talks only to our proxy (T4). The client never sends a model name (T7).
export const AI_ENDPOINT_PATH = '/api/ai';
// Matches the server's AI_TIMEOUT_MS so a slow call fails the same way on both sides (T5).
// Slightly above the server's own 30 s limit, so the client can read the server's 503 or 402
// instead of aborting first.
export const DEFAULT_AI_TIMEOUT_MS = 35_000;
const HTTP_PAYMENT_REQUIRED = 402;

export type AiRequestOf<T extends AiTask> = Extract<AiRequest, { task: T }>;

// `aborted` is the caller's own cancel. Everything else the server can say is an ErrorCode.
export type AiErrorKind = ErrorCode | 'aborted';
export interface AiClientError {
  kind: AiErrorKind;
}

export type AiClientResult<T extends AiTask> =
  { ok: true; value: AiResponse<T> } | { ok: false; error: AiClientError };

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface AiClient {
  // Never throws: every failure is a typed result (AGENTS, errors).
  run<T extends AiTask>(request: AiRequestOf<T>, signal?: AbortSignal): Promise<AiClientResult<T>>;
}

export interface AiClientOptions {
  fetchImpl: FetchLike;
  baseUrl?: string;
  timeoutMs?: number;
}

interface AiFailure {
  ok: false;
  error: AiClientError;
}

const failure = (kind: AiErrorKind): AiFailure => ({ ok: false, error: { kind } });

// A 402 always means out of credit (D14). Other errors carry the shared ErrorBody code;
// anything that does not parse as one is an outage.
const errorKindFor = (status: number, body: unknown): ErrorCode => {
  if (status === HTTP_PAYMENT_REQUIRED) {
    return 'out_of_credit';
  }
  const parsed = ErrorBodySchema.safeParse(body);
  return parsed.success ? parsed.data.error.code : 'unavailable';
};

export const createAiClient = ({
  fetchImpl,
  baseUrl = AI_ENDPOINT_PATH,
  timeoutMs = DEFAULT_AI_TIMEOUT_MS,
}: AiClientOptions): AiClient => {
  // Aborts are the caller's cancel only when the caller's own signal fired; a timeout is an outage.
  const failedBecause = (signal: AbortSignal | undefined, kind: ErrorCode): AiFailure =>
    failure(signal?.aborted === true ? 'aborted' : kind);

  const run = async <T extends AiTask>(
    request: AiRequestOf<T>,
    signal?: AbortSignal,
  ): Promise<AiClientResult<T>> => {
    const sent = AiRequestSchema.safeParse(request);
    if (!sent.success) {
      return failure('invalid_request');
    }
    if (signal?.aborted === true) {
      return failure('aborted');
    }

    const timeout = AbortSignal.timeout(timeoutMs);
    const requestSignal = signal === undefined ? timeout : AbortSignal.any([signal, timeout]);

    let response: Response;
    try {
      response = await fetchImpl(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sent.data),
        signal: requestSignal,
      });
    } catch {
      return failedBecause(signal, 'unavailable');
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return failedBecause(signal, 'unavailable');
    }

    if (!response.ok) {
      return failure(errorKindFor(response.status, body));
    }

    const parsed = AiResponseSchemas[sent.data.task].safeParse(body);
    if (!parsed.success) {
      return failure('unavailable');
    }
    // TypeScript cannot link the runtime task of `sent.data` to the generic T. The schema for
    // that task has just validated `parsed.data`, so the value is an AiResponse<T>.
    return { ok: true, value: parsed.data as AiResponse<T> };
  };

  return { run };
};
