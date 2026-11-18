import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBodySchema, type AiRequest, type ErrorCode } from '@shared/schemas';
import { createApp } from './app';
import type { AiResult, AiService } from './ai/service';
import { parseConfig, type Config } from './config';

const SECRET_KEY = 'sk-or-v1-test-secret-4b9d2e';

const validEnv: Record<string, string | undefined> = {
  OPENROUTER_API_KEY: SECRET_KEY,
  MODEL_ANALYZE: 'test/analyze-model',
  MODEL_REWRITE: 'test/rewrite-model',
  MODEL_RESTRUCTURE: 'test/restructure-model',
  MAX_INPUT_CHARS: '20000',
};

const config = parseConfig(validEnv);

// Stands in for document text that must never reach a client or a log (T10).
const SENTINEL = 'sentinel-document-text-7f3a';

const DEFAULT_TIMEOUT_MS = 60_000;
const OK: AiResult = { ok: true, value: { flags: [] } };

interface AiCall {
  request: AiRequest;
  signal: AbortSignal;
}

type Responder = (request: AiRequest, signal: AbortSignal) => Promise<AiResult>;

// A fake at the service boundary (T9): it records each call and answers with the given responder.
const fakeAi = (
  respond: Responder = () => Promise.resolve(OK),
): { service: AiService; calls: AiCall[] } => {
  const calls: AiCall[] = [];
  const service: AiService = {
    run: (request, signal) => {
      calls.push({ request, signal });
      return respond(request, signal);
    },
  };
  return { service, calls };
};

// Resolves as unavailable once the signal aborts, the way a slow provider call would end.
const untilAborted = (signal: AbortSignal): Promise<AiResult> =>
  new Promise((resolve) => {
    const finish = (): void => {
      resolve({ ok: false, error: { kind: 'unavailable' } });
    };
    if (signal.aborted) {
      finish();
      return;
    }
    signal.addEventListener('abort', finish, { once: true });
  });

interface BuildOptions {
  config?: Config;
  timeoutMs?: number;
  respond?: Responder;
}

interface TestApp {
  app: Hono;
  calls: AiCall[];
  logged: Record<string, unknown>[];
}

const buildApp = (options: BuildOptions = {}): TestApp => {
  const logged: Record<string, unknown>[] = [];
  const ai = fakeAi(options.respond);
  const app = createApp({
    config: options.config ?? config,
    ai: ai.service,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    log: (line) => {
      logged.push(line);
    },
  });
  return { app, calls: ai.calls, logged };
};

// Reads a JSON body as unknown, so no `any` leaks into the assertions.
// Durations vary per run: assert each is a non-negative number, then compare the rest exactly.
const withoutDuration = (lines: readonly Record<string, unknown>[]): Record<string, unknown>[] =>
  lines.map((line) => {
    expect(typeof line.duration_ms).toBe('number');
    return { ...line, duration_ms: 0 };
  });

const readBody = async (response: Response): Promise<unknown> => {
  const body: unknown = await response.json();
  return body;
};

// Checks the shared ErrorBody shape (T5). The message must be a non-empty string, which the
// schema enforces, so the assertions do not depend on the wording.
const expectErrorBody = (body: unknown, code: ErrorCode): void => {
  const parsed = ErrorBodySchema.safeParse(body);
  expect(parsed).toMatchObject({ success: true, data: { error: { code } } });
};

interface PostOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// Sends as a local JSON client by default: Host on loopback, JSON content type, no Origin.
const postAi = async (app: Hono, body: string, options: PostOptions = {}): Promise<Response> =>
  await app.request('/api/ai', {
    method: 'POST',
    headers: { host: 'localhost:8787', 'content-type': 'application/json', ...options.headers },
    body,
    signal: options.signal ?? null,
  });

const analyzeBody = { task: 'analyze', paragraph: 'The report was late again.' };
const rewriteBody = {
  task: 'rewrite',
  paragraph: 'The report was late again.',
  quote: 'late again',
  tone: 'auto',
  length: 'same',
  instructions: '',
};

describe('createApp', () => {
  it('answers the health route with status ok (T4)', async () => {
    const { app } = buildApp();
    const response = await app.request('/api/health');
    const body: unknown = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'ok' });
  });

  it('lists the configured model names and nothing else (T4, T7)', async () => {
    const { app } = buildApp();
    const response = await app.request('/api/info');
    const body: unknown = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      models: {
        analyze: config.MODEL_ANALYZE,
        rewrite: config.MODEL_REWRITE,
        restructure: config.MODEL_RESTRUCTURE,
      },
    });
  });

  it('returns a JSON 404 for a route that does not exist (T4)', async () => {
    const { app } = buildApp();
    const response = await app.request('/api/unknown');
    const body: unknown = await readBody(response);

    expect(response.status).toBe(404);
    expectErrorBody(body, 'invalid_request');
  });

  it('returns a fixed 500 body and logs only the error name, never the message (T10)', async () => {
    const { app, logged } = buildApp();
    app.get('/boom', () => {
      throw new Error(`failed on ${SENTINEL}`);
    });

    const response = await app.request('/boom');
    const text = await response.text();
    const body: unknown = JSON.parse(text);

    expect(response.status).toBe(500);
    expectErrorBody(body, 'unavailable');
    expect(text).not.toContain(SENTINEL);
    expect(JSON.stringify(logged)).not.toContain(SENTINEL);
    expect(logged).toEqual([{ level: 'error', event: 'unhandled', name: 'Error' }]);
  });

  it('keeps the status of a deliberate HTTPException (T4)', async () => {
    const { app } = buildApp();
    app.get('/too-large', () => {
      throw new HTTPException(413);
    });

    const response = await app.request('/too-large');
    const body: unknown = await readBody(response);

    expect(response.status).toBe(413);
    expectErrorBody(body, 'invalid_request');
  });
});

describe('POST /api/ai', () => {
  it('returns the task response through its schema on success (T5)', async () => {
    const { app, calls } = buildApp();

    const response = await postAi(app, JSON.stringify(analyzeBody));
    const body: unknown = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({ flags: [] });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.request).toEqual(analyzeBody);
  });

  it('rejects an unknown model field with a strict schema (T7)', async () => {
    const { app, calls } = buildApp();

    const response = await postAi(app, JSON.stringify({ ...analyzeBody, model: 'x/evil-model' }));
    const body: unknown = await readBody(response);

    expect(response.status).toBe(400);
    expectErrorBody(body, 'invalid_request');
    expect(calls).toHaveLength(0);
  });

  it('rejects a body that is not JSON with invalid_request', async () => {
    const { app, calls } = buildApp();

    const response = await postAi(app, '{not json');
    const body: unknown = await readBody(response);

    expect(response.status).toBe(400);
    expectErrorBody(body, 'invalid_request');
    expect(calls).toHaveLength(0);
  });

  it('maps an unavailable result to 503 with the shared error body (T5)', async () => {
    const { app } = buildApp({
      respond: () => Promise.resolve({ ok: false, error: { kind: 'unavailable' } }),
    });

    const response = await postAi(app, JSON.stringify(analyzeBody));
    const body: unknown = await readBody(response);

    expect(response.status).toBe(503);
    expectErrorBody(body, 'unavailable');
  });

  it('maps an unexpected throw to 503 unavailable without its message', async () => {
    const { app, logged } = buildApp({
      respond: () => Promise.reject(new Error(`provider said ${SENTINEL}`)),
    });

    const response = await postAi(app, JSON.stringify(analyzeBody));
    const text = await response.text();

    expect(response.status).toBe(503);
    const body: unknown = JSON.parse(text);
    expectErrorBody(body, 'unavailable');
    expect(text).not.toContain(SENTINEL);
    expect(JSON.stringify(logged)).not.toContain(SENTINEL);
    expect(logged).toContainEqual({ level: 'error', event: 'unhandled', name: 'Error' });
  });

  it('answers 503 when the service output fails the task response schema (T10)', async () => {
    const { app } = buildApp({
      respond: () => Promise.resolve({ ok: true, value: { replacement: '' } }),
    });

    const response = await postAi(app, JSON.stringify(rewriteBody));

    expect(response.status).toBe(503);
    expectErrorBody(await readBody(response), 'unavailable');
  });

  it('rejects a body that is not sent as JSON before reading it (T7)', async () => {
    const { app, calls, logged } = buildApp();

    const response = await postAi(app, JSON.stringify(analyzeBody), {
      headers: { 'content-type': 'text/plain' },
    });

    expect(response.status).toBe(400);
    expectErrorBody(await readBody(response), 'invalid_request');
    expect(calls).toHaveLength(0);
    expect(logged).toMatchObject([{ event: 'ai_request', task: null, status: 400 }]);
  });

  it('rejects a request without a Content-Type (T7)', async () => {
    const { app, calls } = buildApp();

    const response = await postAi(app, JSON.stringify(analyzeBody), {
      headers: { 'content-type': '' },
    });

    expect(response.status).toBe(400);
    expectErrorBody(await readBody(response), 'invalid_request');
    expect(calls).toHaveLength(0);
  });

  it('rejects a foreign or null Origin with 403 before calling the service (T7)', async () => {
    const { app, calls, logged } = buildApp();

    const foreign = await postAi(app, JSON.stringify(analyzeBody), {
      headers: { origin: 'https://evil.example' },
    });
    expect(foreign.status).toBe(403);
    expectErrorBody(await readBody(foreign), 'invalid_request');

    const opaque = await postAi(app, JSON.stringify(analyzeBody), {
      headers: { origin: 'null' },
    });
    expect(opaque.status).toBe(403);
    expectErrorBody(await readBody(opaque), 'invalid_request');

    expect(calls).toHaveLength(0);
    expect(logged).toMatchObject([
      { event: 'ai_request', task: null, status: 403 },
      { event: 'ai_request', task: null, status: 403 },
    ]);
  });

  it('rejects a Host that is not loopback, which blocks DNS rebinding (T4, T7)', async () => {
    const { app, calls } = buildApp();

    for (const host of ['evil.example:8787', 'localhost.evil.example', 'example.com']) {
      const response = await postAi(app, JSON.stringify(analyzeBody), { headers: { host } });
      expect(response.status).toBe(403);
      expectErrorBody(await readBody(response), 'invalid_request');
    }
    expect(calls).toHaveLength(0);
  });

  it('accepts loopback hosts and origins on any port, including the Vite dev server (T4)', async () => {
    const { app, calls } = buildApp();
    const sources = [
      { host: 'localhost:8787', origin: 'http://localhost:5173' },
      { host: '127.0.0.1:8787', origin: 'http://127.0.0.1:3000' },
      { host: '[::1]:8787', origin: 'http://[::1]:5173' },
    ];

    for (const source of sources) {
      const response = await postAi(app, JSON.stringify(analyzeBody), { headers: source });
      expect(response.status).toBe(200);
    }
    expect(calls).toHaveLength(sources.length);
  });

  it('rejects a body larger than the limit with 413 too_large before parsing', async () => {
    const { app, calls, logged } = buildApp();
    const sections = Array.from({ length: 50 }, () => ({ heading: '', body: 'x'.repeat(4000) }));

    const response = await postAi(
      app,
      JSON.stringify({ task: 'restructure', action: 'merge', section: 0, sections }),
    );
    const body: unknown = await readBody(response);

    expect(response.status).toBe(413);
    expectErrorBody(body, 'too_large');
    expect(calls).toHaveLength(0);
    expect(logged).toMatchObject([{ event: 'ai_request', task: null, status: 413 }]);
  });

  it('rejects text over MAX_INPUT_CHARS with 413 and accepts text at the cap', async () => {
    const smallConfig = parseConfig({ ...validEnv, MAX_INPUT_CHARS: '100' });
    const { app, calls } = buildApp({ config: smallConfig });

    const over = await postAi(app, JSON.stringify({ ...analyzeBody, paragraph: 'x'.repeat(101) }));
    expect(over.status).toBe(413);
    expectErrorBody(await readBody(over), 'too_large');
    expect(calls).toHaveLength(0);

    const atCap = await postAi(app, JSON.stringify({ ...analyzeBody, paragraph: 'x'.repeat(100) }));
    expect(atCap.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  it('passes a signal that aborts at the timeout and returns 503 (T5)', async () => {
    const { app, calls } = buildApp({
      timeoutMs: 5,
      respond: (_request, signal) => untilAborted(signal),
    });

    const response = await postAi(app, JSON.stringify(analyzeBody));

    expect(response.status).toBe(503);
    expect(calls[0]?.signal.aborted).toBe(true);
  });

  it('cancels the service call when the client disconnects (T5)', async () => {
    const { app, calls } = buildApp({ respond: (_request, signal) => untilAborted(signal) });
    const client = new AbortController();

    const pending = postAi(app, JSON.stringify(analyzeBody), { signal: client.signal });
    await vi.waitFor(() => {
      expect(calls).toHaveLength(1);
    });
    client.abort();
    const response = await pending;

    expect(response.status).toBe(503);
    expect(calls[0]?.signal.aborted).toBe(true);
  });

  it('stops calling the service after out_of_credit until the app is rebuilt (D14, T7)', async () => {
    const { app, calls } = buildApp({
      respond: () => Promise.resolve({ ok: false, error: { kind: 'out_of_credit' } }),
    });

    const first = await postAi(app, JSON.stringify(analyzeBody));
    expect(first.status).toBe(402);
    expectErrorBody(await readBody(first), 'out_of_credit');

    const second = await postAi(app, JSON.stringify(rewriteBody));
    expect(second.status).toBe(402);
    expectErrorBody(await readBody(second), 'out_of_credit');
    expect(calls).toHaveLength(1);

    const other = buildApp();
    const fresh = await postAi(other.app, JSON.stringify(analyzeBody));
    expect(fresh.status).toBe(200);
    expect(other.calls).toHaveLength(1);
  });

  it('logs one line per request with task, status and duration only (T10)', async () => {
    const { app, logged } = buildApp();

    await postAi(app, JSON.stringify(analyzeBody));

    expect(withoutDuration(logged)).toEqual([
      {
        level: 'info',
        event: 'ai_request',
        task: 'analyze',
        status: 200,
        duration_ms: 0,
      },
    ]);
  });

  it('keeps document text and the API key out of every response and log line (T4, T10)', async () => {
    const { app, logged } = buildApp({
      respond: () => Promise.resolve({ ok: false, error: { kind: 'unavailable' } }),
    });
    const sentinelBody = { ...analyzeBody, paragraph: `Draft ${SENTINEL}` };

    const response = await postAi(app, JSON.stringify(sentinelBody));
    const text = await response.text();
    const invalid = await postAi(
      app,
      JSON.stringify({ task: 'analyze', paragraph: SENTINEL, model: SECRET_KEY }),
    );
    const invalidText = await invalid.text();

    for (const seen of [text, invalidText, JSON.stringify(logged)]) {
      expect(seen).not.toContain(SENTINEL);
      expect(seen).not.toContain(SECRET_KEY);
    }
    expect(withoutDuration(logged)).toEqual([
      {
        level: 'info',
        event: 'ai_request',
        task: 'analyze',
        status: 503,
        duration_ms: 0,
      },
      {
        level: 'info',
        event: 'ai_request',
        task: null,
        status: 400,
        duration_ms: 0,
      },
    ]);
  });
});
