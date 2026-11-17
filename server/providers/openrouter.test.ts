import { describe, expect, it, vi } from 'vitest';
import type { ProviderRequest } from '../ai/provider';
import { createOpenRouterProvider, type FetchLike } from './openrouter';

const API_KEY = 'sk-or-test-key-0123456789';
const MODEL = 'test/analyze-model';
const MAX_OUTPUT_TOKENS = 512;
const SYSTEM = 'You are a careful editor.';
const USER = 'We did it in order to win.';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const completion = (content: unknown): unknown => ({
  choices: [{ message: { role: 'assistant', content } }],
});

const makeRequest = (signal: AbortSignal = new AbortController().signal): ProviderRequest => ({
  model: MODEL,
  system: SYSTEM,
  user: USER,
  maxOutputTokens: MAX_OUTPUT_TOKENS,
  signal,
});

const scriptedFetch = (response: Response): ReturnType<typeof vi.fn<FetchLike>> =>
  vi.fn<FetchLike>(() => Promise.resolve(response));

const firstCall = (fetchImpl: ReturnType<typeof vi.fn<FetchLike>>) => {
  const call = fetchImpl.mock.calls[0];
  if (call === undefined) {
    throw new Error('fetch was not called');
  }
  return call;
};

// The adapter always sends a string body; any other shape fails the test before parsing.
const sentBody = (init: RequestInit | undefined): unknown => {
  if (typeof init?.body !== 'string') {
    throw new Error('request body was not a string');
  }
  return JSON.parse(init.body);
};

describe('createOpenRouterProvider', () => {
  it('returns the reply text and sends the exact request the service asked for', async () => {
    const fetchImpl = scriptedFetch(jsonResponse(completion('{"flags":[]}')));
    const provider = createOpenRouterProvider({ apiKey: API_KEY, fetchImpl });
    const request = makeRequest();

    const result = await provider.complete(request);

    expect(result).toEqual({ ok: true, text: '{"flags":[]}' });
    const [url, init] = firstCall(fetchImpl);
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    });
    expect(init?.signal).toBe(request.signal);
    expect(sentBody(init)).toEqual({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: USER },
      ],
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.2,
    });
  });

  it('uses a custom base URL when one is given', async () => {
    const fetchImpl = scriptedFetch(jsonResponse(completion('ok')));
    const provider = createOpenRouterProvider({
      apiKey: API_KEY,
      fetchImpl,
      baseUrl: 'http://127.0.0.1:9999/v1',
    });

    await provider.complete(makeRequest());

    expect(firstCall(fetchImpl)[0]).toBe('http://127.0.0.1:9999/v1/chat/completions');
  });

  it('maps 402 to out_of_credit', async () => {
    const provider = createOpenRouterProvider({
      apiKey: API_KEY,
      fetchImpl: scriptedFetch(jsonResponse({ error: { message: 'no credits' } }, 402)),
    });

    expect(await provider.complete(makeRequest())).toEqual({ ok: false, kind: 'out_of_credit' });
  });

  it.each([401, 403, 429, 500, 503])('maps HTTP %i to unavailable', async (status) => {
    const provider = createOpenRouterProvider({
      apiKey: API_KEY,
      fetchImpl: scriptedFetch(jsonResponse({ error: 'upstream' }, status)),
    });

    expect(await provider.complete(makeRequest())).toEqual({ ok: false, kind: 'unavailable' });
  });

  it('maps a rejected network request to unavailable', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.reject(new TypeError('fetch failed')));
    const provider = createOpenRouterProvider({ apiKey: API_KEY, fetchImpl });

    expect(await provider.complete(makeRequest())).toEqual({ ok: false, kind: 'unavailable' });
  });

  it('maps an aborted request to unavailable instead of throwing', async () => {
    // Mirrors fetch: the pending request rejects with AbortError once its signal fires.
    const fetchImpl = vi.fn<FetchLike>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );
    const provider = createOpenRouterProvider({ apiKey: API_KEY, fetchImpl });
    const controller = new AbortController();

    const pending = provider.complete(makeRequest(controller.signal));
    controller.abort();

    expect(await pending).toEqual({ ok: false, kind: 'unavailable' });
  });

  it('maps a body that is not JSON to unavailable', async () => {
    const provider = createOpenRouterProvider({
      apiKey: API_KEY,
      fetchImpl: scriptedFetch(new Response('<html>gateway</html>', { status: 200 })),
    });

    expect(await provider.complete(makeRequest())).toEqual({ ok: false, kind: 'unavailable' });
  });

  it.each([
    ['no content field', { choices: [{ message: {} }] }],
    ['null content', completion(null)],
    ['content is not a string', completion(42)],
    ['empty choices', { choices: [] }],
    ['no choices field', { id: 'gen-1' }],
  ])('maps a 2xx reply with %s to unavailable', async (_label, body) => {
    const provider = createOpenRouterProvider({
      apiKey: API_KEY,
      fetchImpl: scriptedFetch(jsonResponse(body)),
    });

    expect(await provider.complete(makeRequest())).toEqual({ ok: false, kind: 'unavailable' });
  });

  it('keeps non-ASCII text intact in both directions', async () => {
    const reply = 'Café naïve — 日本語 “quotes” 🙂';
    const fetchImpl = scriptedFetch(jsonResponse(completion(reply)));
    const provider = createOpenRouterProvider({ apiKey: API_KEY, fetchImpl });
    const request = { ...makeRequest(), user: 'Señor — 東京 café' };

    const result = await provider.complete(request);

    expect(result).toEqual({ ok: true, text: reply });
    const [, init] = firstCall(fetchImpl);
    expect(sentBody(init)).toMatchObject({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: 'Señor — 東京 café' },
      ],
    });
  });

  it('never includes the API key in any returned value', async () => {
    const scenarios: (() => Response | Error)[] = [
      () => jsonResponse(completion('fine')),
      () => jsonResponse({ error: 'bad' }, 401),
      () => jsonResponse({ error: 'no credits' }, 402),
      () => new Response('not json', { status: 200 }),
      () => new Error('socket hang up'),
    ];

    for (const scenario of scenarios) {
      const fetchImpl = vi.fn<FetchLike>(() => {
        const outcome = scenario();
        return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome);
      });
      const provider = createOpenRouterProvider({ apiKey: API_KEY, fetchImpl });

      const result = await provider.complete(makeRequest());

      expect(JSON.stringify(result)).not.toContain(API_KEY);
    }
  });
});
