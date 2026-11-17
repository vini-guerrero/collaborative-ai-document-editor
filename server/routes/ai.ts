import { Hono } from 'hono';
import type { Context } from 'hono';
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

export interface AiRouteDeps {
  // MAX_INPUT_CHARS from config: the cap on text characters across one request (T7).
  maxInputChars: number;
  ai: AiService;
  timeoutMs: number;
  // Receives structured log lines. Only task, status and duration are ever logged (T10).
  log: (line: Record<string, unknown>) => void;
}

type ErrorStatus = 400 | 402 | 413 | 503;

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

const fail = (c: Context, code: ErrorCode): Response => {
  const { status, message } = ERRORS[code];
  const body: ErrorBody = { error: { code, message } };
  return c.json(body, status);
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
  c: Context,
  request: AiRequest,
  deps: AiRouteDeps,
  credit: CreditLatch,
): Promise<Response> => {
  // The call ends on timeout or when the client disconnects, whichever comes first (T5).
  const signal = AbortSignal.any([AbortSignal.timeout(deps.timeoutMs), c.req.raw.signal]);

  let result: AiResult;
  try {
    result = await deps.ai.run(request, signal);
  } catch {
    // An unexpected throw is an outage to the client. Its details stay out of the response and log.
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

interface Outcome {
  response: Response;
  task: AiTask | null;
}

const answer = async (c: Context, deps: AiRouteDeps, credit: CreditLatch): Promise<Outcome> => {
  let body: unknown;
  try {
    body = await c.req.json<unknown>();
  } catch {
    return { response: fail(c, 'invalid_request'), task: null };
  }

  // Strict schemas reject unknown fields, so a client cannot choose a model (T7).
  const parsed = AiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { response: fail(c, 'invalid_request'), task: null };
  }

  const request = parsed.data;
  if (countInputChars(request) > deps.maxInputChars) {
    return { response: fail(c, 'too_large'), task: request.task };
  }
  if (credit.isStopped()) {
    return { response: fail(c, 'out_of_credit'), task: request.task };
  }
  return { response: await runService(c, request, deps, credit), task: request.task };
};

// The route is mounted by createApp and owns its credit latch. Tests build it through createApp.
export const createAiRoute = (deps: AiRouteDeps): Hono => {
  const route = new Hono();
  const credit = createCreditLatch();

  route.use(
    '/api/ai',
    bodyLimit({
      maxSize: bodyLimitBytes(deps.maxInputChars),
      onError: (c) => fail(c, 'too_large'),
    }),
  );

  route.post('/api/ai', async (c) => {
    const startedAt = performance.now();
    const { response, task } = await answer(c, deps, credit);
    deps.log({
      level: 'info',
      event: 'ai_request',
      task,
      status: response.status,
      duration_ms: Math.round(performance.now() - startedAt),
    });
    return response;
  });

  return route;
};
