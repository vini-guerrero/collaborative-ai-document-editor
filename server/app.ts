import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ErrorBody } from '@shared/schemas';
import type { AiService } from './ai/service';
import type { Config } from './config';
import { createAiRoute } from './routes/ai';

export interface AppDeps {
  config: Config;
  // The AI service is injected so tests can fake the model boundary (T9).
  ai: AiService;
  // Upper bound on one AI call, including the provider round trip (T5).
  timeoutMs: number;
  // Injected so tests can capture log lines; main.ts writes them to stdout.
  log: (line: Record<string, unknown>) => void;
}

// The factory receives its dependencies, so tests build the app without starting a server.
export const createApp = (deps: AppDeps): Hono => {
  const app = new Hono();

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.route(
    '/',
    createAiRoute({
      maxInputChars: deps.config.MAX_INPUT_CHARS,
      ai: deps.ai,
      timeoutMs: deps.timeoutMs,
      log: deps.log,
    }),
  );

  app.notFound((c) => {
    const body: ErrorBody = {
      error: { code: 'invalid_request', message: 'The route does not exist.' },
    };
    return c.json(body, 404);
  });

  // Every error body uses the shared ErrorBody shape. Deliberate HTTP errors keep their status.
  // Anything else becomes a 500 unavailable with no stack trace. Only the error name is logged,
  // because the message may contain document text (T10).
  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      const body: ErrorBody = {
        error: { code: 'invalid_request', message: 'The request failed.' },
      };
      return c.json(body, error.status);
    }
    deps.log({ level: 'error', event: 'unhandled', name: error.name });
    const body: ErrorBody = {
      error: { code: 'unavailable', message: 'The server could not complete the request.' },
    };
    return c.json(body, 500);
  });

  return app;
};
