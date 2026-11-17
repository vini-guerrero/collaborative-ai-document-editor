import { serve } from '@hono/node-server';
import { createApp } from './app';
import { parseConfig } from './config';

// Loopback only: the proxy is a local dev server, not reachable from the network (T4).
const HOST = '127.0.0.1';

// The only file that reads process.env (T7). Configuration is parsed once, at startup.
const config = parseConfig(process.env);

const log = (line: Record<string, unknown>): void => {
  process.stdout.write(`${JSON.stringify(line)}\n`);
};

const app = createApp({ config, log });

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
