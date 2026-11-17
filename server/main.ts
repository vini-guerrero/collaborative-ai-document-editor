import { serve } from '@hono/node-server';
import { createApp } from './app';
import { createAiService } from './ai/service';
import { parseConfig } from './config';
import { createOpenRouterProvider } from './providers/openrouter';

// Loopback only: the proxy is a local dev server, not reachable from the network (T4).
const HOST = '127.0.0.1';
// Caps the reply length per call (T5, T7 cost control).
const MAX_OUTPUT_TOKENS = 1024;
// One AI call, including the provider round trip, may take at most this long (T5).
const AI_TIMEOUT_MS = 30_000;

// The only file that reads process.env (T7). Configuration is parsed once, at startup.
const config = parseConfig(process.env);

const log = (line: Record<string, unknown>): void => {
  process.stdout.write(`${JSON.stringify(line)}\n`);
};

const provider = createOpenRouterProvider({
  apiKey: config.OPENROUTER_API_KEY,
  fetchImpl: fetch,
});

const ai = createAiService({
  provider,
  models: {
    analyze: config.MODEL_ANALYZE,
    rewrite: config.MODEL_REWRITE,
    restructure: config.MODEL_RESTRUCTURE,
  },
  maxOutputTokens: MAX_OUTPUT_TOKENS,
});

const app = createApp({ config, ai, timeoutMs: AI_TIMEOUT_MS, log });

const server = serve({ fetch: app.fetch, port: config.PORT, hostname: HOST }, (info) => {
  log({ level: 'info', event: 'listening', address: info.address, port: info.port });
});

const shutdown = (): void => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
