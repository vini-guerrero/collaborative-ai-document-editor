import { describe, expect, it, vi } from 'vitest';
import type { ProviderRequest } from '../ai/provider';
import { createOpenRouterProvider, type FetchLike } from './openrouter';

const API_KEY = 'sk-or-test-key-0123456789';
const MODEL = 'test/analyze-model';
const MAX_OUTPUT_TOKENS = 512;
const SYSTEM = 'You are a careful editor.';
const USER = 'We did it in order to win.';
// Mirrors MAX_RESPONSE_BYTES in the adapter; a test must fail if the cap ever changes silently.
const MAX_RESPONSE_BYTES = 256 * 1024;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// A response whose body stream reports cancellation, so a test can see the socket being released.
const cancellableResponse = (
  status: number,
  cancel: () => void,
  headers: Record<string, string> = {},
): Response => new Response(new ReadableStream({ cancel }), { status, headers });

// A chunked reply with no Content-Length: one stream chunk per entry, then the stream closes.
const chunkedResponse = (chunks: Uint8Array[]): Response => {
  let next = 0;
  return new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks[next];
        next += 1;
        if (chunk === undefined) {
          controller.close();
        } else {
          controller.enqueue(chunk);
        }
      },
    }),
    { status: 200 },
  );
};

// A reply that never ends, so only cancellation can stop the reader.
const endlessResponse = (cancel: () => void): Response =>
  new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(64 * 1024).fill(0x20));
      },
      cancel,
    }),
    { status: 200 },
  );

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
      reasoning: { effort: 'low' },
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
    [402, 'out_of_credit'],
    [500, 'unavailable'],
  ] as const)('cancels the body of a failed HTTP %i reply', async (status, kind) => {
    const cancel = vi.fn();
    const provider = createOpenRouterProvider({
      apiKey: API_KEY,
      fetchImpl: scriptedFetch(cancellableResponse(status, cancel)),
    });

    expect(await provider.complete(makeRequest())).toEqual({ ok: false, kind });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('rejects an oversize declared Content-Length and cancels the body', async () => {
    const cancel = vi.fn();
    const provider = createOpenRouterProvider({
      apiKey: API_KEY,
      fetchImpl: scriptedFetch(
        cancellableResponse(200, cancel, { 'content-length': String(MAX_RESPONSE_BYTES + 1) }),
      ),
    });

    expect(await provider.complete(makeRequest())).toEqual({ ok: false, kind: 'unavailable' });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('rejects a 2xx reply whose actual text is over the cap', async () => {
    const provider = createOpenRouterProvider({
      apiKey: API_KEY,
      fetchImpl: scriptedFetch(new Response('x'.repeat(MAX_RESPONSE_BYTES + 1), { status: 200 })),
    });

    expect(await provider.complete(makeRequest())).toEqual({ ok: false, kind: 'unavailable' });
  });

  it('measures the cap in bytes, not characters', async () => {
    // Each euro sign is 3 UTF-8 bytes: under the cap in characters, over it in bytes.
    const oversizeInBytes = '€'.repeat(Math.ceil(MAX_RESPONSE_BYTES / 3) + 1);
    const provider = createOpenRouterProvider({
      apiKey: API_KEY,
      fetchImpl: scriptedFetch(new Response(oversizeInBytes, { status: 200 })),
    });

    expect(await provider.complete(makeRequest())).toEqual({ ok: false, kind: 'unavailable' });
  });

  it('reads a chunked reply without Content-Length, decoding text split across chunks', async () => {
    const reply = 'Café — 日本語 🙂';
    const bytes = new TextEncoder().encode(JSON.stringify(completion(reply)));
    // One byte per chunk splits every multi-byte character across chunk boundaries.
    const chunks = Array.from(bytes, (byte) => new Uint8Array([byte]));
    const provider = createOpenRouterProvider({
      apiKey: API_KEY,
      fetchImpl: scriptedFetch(chunkedResponse(chunks)),
    });

    expect(await provider.complete(makeRequest())).toEqual({ ok: true, text: reply });
  });

  it('cancels an endless chunked reply as soon as it passes the cap', async () => {
    const cancel = vi.fn();
    const provider = createOpenRouterProvider({
      apiKey: API_KEY,
      fetchImpl: scriptedFetch(endlessResponse(cancel)),
    });

    expect(await provider.complete(makeRequest())).toEqual({ ok: false, kind: 'unavailable' });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('maps a 2xx reply with no body to unavailable', async () => {
    const provider = createOpenRouterProvider({
      apiKey: API_KEY,
      fetchImpl: scriptedFetch(new Response(null, { status: 200 })),
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
