import { describe, expect, it, vi } from 'vitest';
import { createAiClient, type AiRequestOf, type FetchLike } from './client';

// T9: no test calls the real model. The fake fetch stands in for the proxy.
const PARAGRAPH = 'The launch moved to next week.';

const analyzeRequest: AiRequestOf<'analyze'> = { task: 'analyze', paragraph: PARAGRAPH };
const rewriteRequest: AiRequestOf<'rewrite'> = {
  task: 'rewrite',
  paragraph: PARAGRAPH,
  quote: 'moved',
  tone: 'auto',
  length: 'same',
  instructions: '',
};
const restructureRequest: AiRequestOf<'restructure'> = {
  task: 'restructure',
  action: 'move',
  section: 0,
  sections: [{ heading: 'Intro', body: PARAGRAPH }],
};

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const fakeFetch = (respond: () => Promise<Response>) => vi.fn<FetchLike>(() => respond());

// Hangs until the client aborts the signal it passed in, so timeouts and cancels are real.
const hangingFetch = () =>
  vi.fn<FetchLike>(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      }),
  );

const clientWith = (fetchImpl: FetchLike, timeoutMs = 30_000) =>
  createAiClient({ fetchImpl, timeoutMs });

describe('createAiClient (T4, T5, T10)', () => {
  it('returns the analyze value when the response matches the analyze schema', async () => {
    const fetchImpl = fakeFetch(() => Promise.resolve(jsonResponse(200, { flags: [] })));

    const result = await clientWith(fetchImpl).run(analyzeRequest);

    expect(result).toEqual({ ok: true, value: { flags: [] } });
  });

  it('returns the rewrite value when the response matches the rewrite schema', async () => {
    const fetchImpl = fakeFetch(() =>
      Promise.resolve(jsonResponse(200, { replacement: 'The launch moved to next week.' })),
    );

    const result = await clientWith(fetchImpl).run(rewriteRequest);

    expect(result).toEqual({
      ok: true,
      value: { replacement: 'The launch moved to next week.' },
    });
  });

  it('returns the restructure operation when the response matches the restructure schema', async () => {
    const operation = { op: 'move', from: 0, to: 0 };
    const fetchImpl = fakeFetch(() => Promise.resolve(jsonResponse(200, operation)));

    const result = await clientWith(fetchImpl).run(restructureRequest);

    expect(result).toEqual({ ok: true, value: operation });
  });

  it('POSTs JSON to the proxy with a signal and no model name (T4, T7)', async () => {
    const fetchImpl = fakeFetch(() => Promise.resolve(jsonResponse(200, { flags: [] })));

    await clientWith(fetchImpl).run(analyzeRequest);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('/api/ai');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    const sent = init?.body;
    if (typeof sent !== 'string') {
      throw new Error('The client must send a string body');
    }
    expect(JSON.parse(sent)).toEqual(analyzeRequest);
    expect(sent).not.toContain('model');
  });

  it('maps 402 to out_of_credit (D14)', async () => {
    const fetchImpl = fakeFetch(() =>
      Promise.resolve(
        jsonResponse(402, { error: { code: 'out_of_credit', message: 'Out of credit.' } }),
      ),
    );

    const result = await clientWith(fetchImpl).run(analyzeRequest);

    expect(result).toEqual({ ok: false, error: { kind: 'out_of_credit' } });
  });

  it('maps a 400 ErrorBody to invalid_request', async () => {
    const fetchImpl = fakeFetch(() =>
      Promise.resolve(
        jsonResponse(400, { error: { code: 'invalid_request', message: 'Bad request.' } }),
      ),
    );

    const result = await clientWith(fetchImpl).run(analyzeRequest);

    expect(result).toEqual({ ok: false, error: { kind: 'invalid_request' } });
  });

  it('maps a 413 ErrorBody to too_large', async () => {
    const fetchImpl = fakeFetch(() =>
      Promise.resolve(jsonResponse(413, { error: { code: 'too_large', message: 'Too large.' } })),
    );

    const result = await clientWith(fetchImpl).run(analyzeRequest);

    expect(result).toEqual({ ok: false, error: { kind: 'too_large' } });
  });

  it('maps a 500 with an ErrorBody to unavailable', async () => {
    const fetchImpl = fakeFetch(() =>
      Promise.resolve(
        jsonResponse(500, { error: { code: 'unavailable', message: 'Try again later.' } }),
      ),
    );

    const result = await clientWith(fetchImpl).run(analyzeRequest);

    expect(result).toEqual({ ok: false, error: { kind: 'unavailable' } });
  });

  it('maps a 500 with a body that is not an ErrorBody to unavailable', async () => {
    const fetchImpl = fakeFetch(() => Promise.resolve(jsonResponse(500, { oops: true })));

    const result = await clientWith(fetchImpl).run(analyzeRequest);

    expect(result).toEqual({ ok: false, error: { kind: 'unavailable' } });
  });

  it('maps a network error to unavailable', async () => {
    const fetchImpl = fakeFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    const result = await clientWith(fetchImpl).run(analyzeRequest);

    expect(result).toEqual({ ok: false, error: { kind: 'unavailable' } });
  });

  it('maps a timeout to unavailable, not aborted', async () => {
    const timeoutMs = 1;

    const result = await clientWith(hangingFetch(), timeoutMs).run(analyzeRequest);

    expect(result).toEqual({ ok: false, error: { kind: 'unavailable' } });
  });

  it('maps the caller aborting mid-flight to aborted', async () => {
    const controller = new AbortController();
    const pending = clientWith(hangingFetch()).run(analyzeRequest, controller.signal);

    controller.abort();

    expect(await pending).toEqual({ ok: false, error: { kind: 'aborted' } });
  });

  it('returns aborted without calling fetch when the caller signal is already aborted', async () => {
    const fetchImpl = fakeFetch(() => Promise.resolve(jsonResponse(200, { flags: [] })));
    const controller = new AbortController();
    controller.abort();

    const result = await clientWith(fetchImpl).run(analyzeRequest, controller.signal);

    expect(result).toEqual({ ok: false, error: { kind: 'aborted' } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps a body that is not JSON to unavailable', async () => {
    const fetchImpl = fakeFetch(() =>
      Promise.resolve(new Response('<html>gateway</html>', { status: 200 })),
    );

    const result = await clientWith(fetchImpl).run(analyzeRequest);

    expect(result).toEqual({ ok: false, error: { kind: 'unavailable' } });
  });

  it('maps a 200 body that fails the response schema to unavailable', async () => {
    const fetchImpl = fakeFetch(() =>
      Promise.resolve(jsonResponse(200, { flags: [{ kind: 'vibes', quote: 'x', reason: 'y' }] })),
    );

    const result = await clientWith(fetchImpl).run(analyzeRequest);

    expect(result).toEqual({ ok: false, error: { kind: 'unavailable' } });
  });

  it('validates the request before sending and returns invalid_request without calling fetch', async () => {
    const fetchImpl = fakeFetch(() => Promise.resolve(jsonResponse(200, { flags: [] })));
    // Deliberately invalid: the client must reject what the type system would let through.
    const invalid = { task: 'analyze', paragraph: '' } as unknown as AiRequestOf<'analyze'>;

    const result = await clientWith(fetchImpl).run(invalid);

    expect(result).toEqual({ ok: false, error: { kind: 'invalid_request' } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects an unknown field in the request before sending it', async () => {
    const fetchImpl = fakeFetch(() => Promise.resolve(jsonResponse(200, { flags: [] })));
    // Deliberately invalid: a client-chosen model must never reach the proxy (T7).
    const withModel = {
      ...analyzeRequest,
      model: 'some-model',
    } as unknown as AiRequestOf<'analyze'>;

    const result = await clientWith(fetchImpl).run(withModel);

    expect(result).toEqual({ ok: false, error: { kind: 'invalid_request' } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('never throws, even when fetch throws synchronously', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => {
      throw new TypeError('boom');
    });

    const result = await clientWith(fetchImpl).run(analyzeRequest);

    expect(result).toEqual({ ok: false, error: { kind: 'unavailable' } });
  });
});
