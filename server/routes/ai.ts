import { Hono } from 'hono';
import type { Context, MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import {
  AiRequestSchema,
  AiResponseSchemas,
  type AiRequest,
  type AiTask,
  type ErrorBody,
  type ErrorCode,
} from '@shared/schemas';
import type { AiResult, AiService } from '../ai/service';

type LogFn = (line: Record<string, unknown>) => void;

export interface AiRouteDeps {
  // MAX_INPUT_CHARS from config: the cap on text characters across one request (T7).
  maxInputChars: number;
  ai: AiService;
  timeoutMs: number;
  // Receives structured log lines. Only task, status and duration are ever logged (T10).
  log: LogFn;
}

// Per-request state: the recorder sets the start time, the handler sets the task (Hono Variables).
interface AiEnv {
  Variables: { startedAt: number; task: AiTask | null };
}
type AiContext = Context<AiEnv>;

type ErrorStatus = 400 | 402 | 403 | 413 | 503;

// Messages are fixed strings, so no document text or provider detail reaches a client (T10).
const ERRORS: Record<ErrorCode, { status: ErrorStatus; message: string }> = {
  invalid_request: { status: 400, message: 'The request is not a valid AI request.' },
  too_large: { status: 413, message: 'The text is larger than the server accepts.' },
  out_of_credit: {
    status: 402,
    message: 'The AI provider is out of credit. Your text is unchanged.',
  },
  unavailable: { status: 503, message: 'The AI service is unavailable. Try again later.' },
};

// A character can arrive as a six-byte \uXXXX JSON escape. The envelope and the section keys of
// a restructure request fit in the overhead.
const MAX_JSON_BYTES_PER_CHAR = 6;
const BODY_OVERHEAD_BYTES = 64 * 1024;

const bodyLimitBytes = (maxInputChars: number): number =>
  maxInputChars * MAX_JSON_BYTES_PER_CHAR + BODY_OVERHEAD_BYTES;

const respondWith = (
  c: AiContext,
  status: ErrorStatus,
  code: ErrorCode,
  message: string,
): Response => {
  const body: ErrorBody = { error: { code, message } };
  return c.json(body, status);
};

const fail = (c: AiContext, code: ErrorCode): Response => {
  const { status, message } = ERRORS[code];
  return respondWith(c, status, code, message);
};

// Only loopback hosts reach the proxy: the dev server and tests, on any port. The Vite dev
// server runs on localhost, so the same rule covers it (T4).
const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

// A Host must name loopback (blocks DNS rebinding). An Origin, when sent, must be loopback
// (blocks cross-site requests). Real clients always send a Host, so a missing one is refused.
const isLocalSource = (host: string | undefined, origin: string | undefined): boolean =>
  host !== undefined &&
  LOOPBACK_HOST.test(host) &&
  (origin === undefined || LOOPBACK_ORIGIN.test(origin));

const isJsonContentType = (contentType: string | undefined): boolean =>
  contentType?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json';

// Runs before the body is read, so a rejected request costs no parsing and no provider call.
const rejectUnsafeRequest = (c: AiContext): Response | undefined => {
  if (!isLocalSource(c.req.header('host'), c.req.header('origin'))) {
    return respondWith(c, 403, 'invalid_request', 'The request source is not allowed.');
  }
  if (!isJsonContentType(c.req.header('content-type'))) {
    return respondWith(c, 400, 'invalid_request', 'The request must be JSON.');
  }
  return undefined;
};

const charsOf = (values: readonly (string | undefined)[]): number =>
  values.reduce<number>((total, value) => total + (value?.length ?? 0), 0);

const countInputChars = (request: AiRequest): number => {
  switch (request.task) {
    case 'analyze':
      return charsOf([request.paragraph, request.heading, request.previous, request.next]);
    case 'rewrite':
      return charsOf([request.paragraph, request.quote, request.instructions, request.answer]);
    case 'restructure':
      return request.sections.reduce(
        (total, section) => total + section.heading.length + section.body.length,
        0,
      );
  }
};

interface CreditLatch {
  isStopped: () => boolean;
  stop: () => void;
}

// D14 / T7: after the provider reports out of credit once, stop calling it until restart.
// The latch lives in one factory call, so each app instance has its own.
const createCreditLatch = (): CreditLatch => {
  let stopped = false;
  return {
    isStopped: () => stopped,
    stop: () => {
      stopped = true;
    },
  };
};

const runService = async (
  c: AiContext,
  request: AiRequest,
  deps: AiRouteDeps,
  credit: CreditLatch,
): Promise<Response> => {
  // The call ends on timeout or when the client disconnects, whichever comes first (T5).
  const signal = AbortSignal.any([AbortSignal.timeout(deps.timeoutMs), c.req.raw.signal]);

  let result: AiResult;
  try {
    result = await deps.ai.run(request, signal);
  } catch (error: unknown) {
    // An unexpected throw is an outage to the client. Only the error name is logged (T10).
    deps.log({
      level: 'error',
      event: 'unhandled',
      name: error instanceof Error ? error.name : 'unknown',
    });
    return fail(c, 'unavailable');
  }

  if (!result.ok) {
    if (result.error.kind === 'out_of_credit') {
      credit.stop();
      return fail(c, 'out_of_credit');
    }
    return fail(c, 'unavailable');
  }

  // Responses leave the server only through the task's response schema (T5).
  const parsed = AiResponseSchemas[request.task].safeParse(result.value);
  if (!parsed.success) {
    return fail(c, 'unavailable');
  }
  return c.json(parsed.data, 200);
};

const answer = async (c: AiContext, deps: AiRouteDeps, credit: CreditLatch): Promise<Response> => {
  let body: unknown;
  try {
    body = await c.req.json<unknown>();
  } catch {
    return fail(c, 'invalid_request');
  }

  // Strict schemas reject unknown fields, so a client cannot choose a model (T7).
  const parsed = AiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(c, 'invalid_request');
  }

  const request = parsed.data;
  c.set('task', request.task);
  if (countInputChars(request) > deps.maxInputChars) {
    return fail(c, 'too_large');
  }
  if (credit.isStopped()) {
    return fail(c, 'out_of_credit');
  }
  return runService(c, request, deps, credit);
};

// Times every request and writes its one log line, including guard and size rejections.
const recordRequest = (log: LogFn): MiddlewareHandler<AiEnv> => {
  return async (c, next) => {
    c.set('startedAt', performance.now());
    c.set('task', null);
    await next();
    log({
      level: 'info',
      event: 'ai_request',
      task: c.get('task'),
      status: c.res.status,
      duration_ms: Math.round(performance.now() - c.get('startedAt')),
    });
  };
};

// The route is mounted by createApp and owns its credit latch. Tests build it through createApp.
export const createAiRoute = (deps: AiRouteDeps): Hono<AiEnv> => {
  const route = new Hono<AiEnv>();
  const credit = createCreditLatch();

  const guard: MiddlewareHandler<AiEnv> = async (c, next) => {
    const rejected = rejectUnsafeRequest(c);
    if (rejected) {
      return rejected;
    }
    await next();
  };

  route.post(
    '/api/ai',
    recordRequest(deps.log),
    guard,
    bodyLimit({
      maxSize: bodyLimitBytes(deps.maxInputChars),
      onError: (c: AiContext) => fail(c, 'too_large'),
    }),
    (c) => answer(c, deps, credit),
  );

  return route;
};
