import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { parseConfig } from './config';

const config = parseConfig({
  OPENROUTER_API_KEY: 'test-key',
  MODEL_ANALYZE: 'test/analyze-model',
  MODEL_REWRITE: 'test/rewrite-model',
  MODEL_RESTRUCTURE: 'test/restructure-model',
  MAX_INPUT_CHARS: '20000',
});

// Stands in for document text or a secret that must never reach a client or a log (T10).
const SENTINEL = 'sentinel-document-text-7f3a';

const buildApp = (logged: Record<string, unknown>[]): Hono =>
  createApp({
    config,
    log: (line) => {
      logged.push(line);
    },
  });

describe('createApp', () => {
  it('answers the health route with status ok (T4)', async () => {
    const response = await buildApp([]).request('/api/health');
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'ok' });
  });

  it('returns a JSON 404 for a route that does not exist (T4)', async () => {
    const response = await buildApp([]).request('/api/unknown');
    const body: unknown = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'not_found' });
  });

  it('returns a fixed 500 body and logs only the error name, never the message (T10)', async () => {
    const logged: Record<string, unknown>[] = [];
    const app = buildApp(logged);
    app.get('/boom', () => {
      throw new Error(`failed on ${SENTINEL}`);
    });

    const response = await app.request('/boom');
    const text = await response.text();
    const body: unknown = JSON.parse(text);

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'internal' });
    expect(text).not.toContain(SENTINEL);
    expect(JSON.stringify(logged)).not.toContain(SENTINEL);
    expect(logged).toEqual([{ level: 'error', event: 'unhandled', name: 'Error' }]);
  });

  it('keeps the status of a deliberate HTTPException (T4)', async () => {
    const app = buildApp([]);
    app.get('/too-large', () => {
      throw new HTTPException(413);
    });

    const response = await app.request('/too-large');
    const body: unknown = await response.json();

    expect(response.status).toBe(413);
    expect(body).toEqual({ error: 'http_error' });
  });
});
