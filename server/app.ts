import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Config } from './config';

export interface AppDeps {
  config: Config;
  // Injected so tests can capture log lines; main.ts writes them to stdout.
  log: (line: Record<string, unknown>) => void;
}

// The factory receives its dependencies, so tests build the app without starting a server.
export const createApp = (deps: AppDeps): Hono => {
  const app = new Hono();

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.notFound((c) => c.json({ error: 'not_found' }, 404));

  // Deliberate HTTP errors keep their status and a fixed body. Anything else becomes a 500 with
  // no stack trace. Only the error name is logged, because the message may contain document text (T10).
  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json({ error: 'http_error' }, error.status);
    }
    deps.log({ level: 'error', event: 'unhandled', name: error.name });
    return c.json({ error: 'internal' }, 500);
  });

  return app;
};
