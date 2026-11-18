import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiClientResult, AiRequestOf } from '@/features/ai';
import { fnv1a32 } from '@/lib/hash';
import type { Flag } from '@shared/schemas';
import {
  ANALYZE_CACHE_CAPACITY,
  createAnalyzeScheduler,
  DEFAULT_PAUSE_MS,
  type AnalyzeSchedulerDeps,
} from './analyzeScheduler';
import { MIN_PARAGRAPH_CHARS, type ParagraphContext } from './paragraphContext';

const PARAGRAPH = 'The launch moved to the second week of March.';
const FLAG: Flag = { kind: 'clarity', quote: 'moved', reason: 'Say why the date changed.' };
const OK_RESULT: AiClientResult<'analyze'> = { ok: true, value: { flags: [FLAG] } };

interface PendingCall {
  readonly request: AiRequestOf<'analyze'>;
  readonly signal: AbortSignal | undefined;
  readonly respond: (result: AiClientResult<'analyze'>) => void;
}

// T9: the AI is faked at the client boundary. Each call stays pending until the test responds.
const createFakeClient = () => {
  const calls: PendingCall[] = [];
  const run = vi.fn(
    (request: AiRequestOf<'analyze'>, signal?: AbortSignal) =>
      new Promise<AiClientResult<'analyze'>>((resolve) => {
        calls.push({ request, signal, respond: resolve });
      }),
  );
  return { run, calls };
};

const callAt = (calls: readonly PendingCall[], index: number): PendingCall => {
  const call = calls[index];
  if (call === undefined) {
    throw new Error(`expected a client call at index ${String(index)}`);
  }
  return call;
};

const ctxOf = (overrides: Partial<ParagraphContext> = {}): ParagraphContext => ({
  id: 'p1',
  text: PARAGRAPH,
  ...overrides,
});

const createHarness = () => {
  const client = createFakeClient();
  const onFlags = vi.fn<AnalyzeSchedulerDeps['onFlags']>();
  const state = { paused: false };
  const scheduler = createAnalyzeScheduler({
    client,
    timers: {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    },
    onFlags,
    isPaused: () => state.paused,
  });
  return { scheduler, client, onFlags, state };
};

describe('analyze scheduler (D4, D1, D14, D15, T10)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('never fires mid-typing: each edit restarts the pause (D4)', async () => {
    const { scheduler, client } = createHarness();
    scheduler.paragraphEdited(ctxOf());
    await vi.advanceTimersByTimeAsync(2900);
    scheduler.paragraphEdited(ctxOf());
    await vi.advanceTimersByTimeAsync(2900);
    expect(client.run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(client.run).toHaveBeenCalledTimes(1);
  });

  it('fires once the paragraph has been still for the 3 s pause (D4)', async () => {
    const { scheduler, client } = createHarness();
    expect(DEFAULT_PAUSE_MS).toBe(3000);
    scheduler.paragraphEdited(ctxOf());
    await vi.advanceTimersByTimeAsync(DEFAULT_PAUSE_MS - 1);
    expect(client.run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(client.run).toHaveBeenCalledTimes(1);
    expect(callAt(client.calls, 0).request.paragraph).toBe(PARAGRAPH);
  });

  it('analyzes at once when the paragraph is left (D4)', () => {
    const { scheduler, client } = createHarness();
    scheduler.paragraphLeft(ctxOf());
    expect(client.run).toHaveBeenCalledTimes(1);
  });

  it('a cache hit re-emits the flags without a second call (D4)', async () => {
    const { scheduler, client, onFlags } = createHarness();
    scheduler.paragraphLeft(ctxOf());
    callAt(client.calls, 0).respond(OK_RESULT);
    await vi.advanceTimersByTimeAsync(0);
    scheduler.paragraphLeft(ctxOf());
    expect(client.run).toHaveBeenCalledTimes(1);
    expect(onFlags).toHaveBeenCalledTimes(2);
    expect(onFlags).toHaveBeenLastCalledWith('p1', fnv1a32(PARAGRAPH), [FLAG]);
  });

  it('an edit aborts the in-flight call (D4)', () => {
    const { scheduler, client } = createHarness();
    scheduler.paragraphLeft(ctxOf());
    const { signal } = callAt(client.calls, 0);
    expect(signal?.aborted).toBe(false);
    scheduler.paragraphEdited(ctxOf({ text: `${PARAGRAPH} Again.` }));
    expect(signal?.aborted).toBe(true);
  });

  it('drops a response whose paragraph text changed before it arrived (T10)', async () => {
    const { scheduler, client, onFlags } = createHarness();
    scheduler.paragraphLeft(ctxOf());
    scheduler.paragraphEdited(ctxOf({ text: `${PARAGRAPH} Changed while waiting.` }));
    callAt(client.calls, 0).respond(OK_RESULT);
    await vi.advanceTimersByTimeAsync(0);
    expect(onFlags).not.toHaveBeenCalled();
  });

  it('emits the flags once, with the paragraph hash, for unchanged text (T10)', async () => {
    const { scheduler, client, onFlags } = createHarness();
    scheduler.paragraphLeft(ctxOf());
    callAt(client.calls, 0).respond(OK_RESULT);
    await vi.advanceTimersByTimeAsync(0);
    expect(onFlags).toHaveBeenCalledTimes(1);
    expect(onFlags).toHaveBeenCalledWith('p1', fnv1a32(PARAGRAPH), [FLAG]);
  });

  it.each([
    ['On demand mode or raw view', false],
    ['the AI being paused', true],
  ])('makes no call while paused by %s (D1, D14, D15)', async (_label, paused) => {
    const { scheduler, client, state } = createHarness();
    state.paused = paused;
    scheduler.paragraphLeft(ctxOf());
    scheduler.paragraphEdited(ctxOf({ id: 'p2' }));
    await vi.advanceTimersByTimeAsync(DEFAULT_PAUSE_MS);
    // Unpaused: the leave call and the idle edit each reach the client once.
    expect(client.run).toHaveBeenCalledTimes(paused ? 0 : 2);
  });

  it('does not cache while paused, so the text is analyzed after unpausing', () => {
    const { scheduler, client, state } = createHarness();
    state.paused = true;
    scheduler.paragraphLeft(ctxOf());
    state.paused = false;
    scheduler.paragraphLeft(ctxOf());
    expect(client.run).toHaveBeenCalledTimes(1);
  });

  it.each(['out_of_credit', 'unavailable', 'aborted'] as const)(
    'emits nothing and caches nothing for a %s result (D14)',
    async (kind) => {
      const { scheduler, client, onFlags } = createHarness();
      scheduler.paragraphLeft(ctxOf());
      callAt(client.calls, 0).respond({ ok: false, error: { kind } });
      await vi.advanceTimersByTimeAsync(0);
      expect(onFlags).not.toHaveBeenCalled();
      scheduler.paragraphLeft(ctxOf());
      expect(client.run).toHaveBeenCalledTimes(2);
    },
  );

  it('evicts the least recently used paragraph beyond the 200 capacity', async () => {
    const { scheduler, client } = createHarness();
    expect(ANALYZE_CACHE_CAPACITY).toBe(200);
    const paragraphs = Array.from({ length: ANALYZE_CACHE_CAPACITY + 1 }, (_, index) =>
      ctxOf({
        id: `p${String(index)}`,
        text: `Paragraph ${String(index)} holds enough prose to analyze.`,
      }),
    );
    for (const ctx of paragraphs) {
      scheduler.paragraphLeft(ctx);
    }
    for (const call of client.calls) {
      call.respond(OK_RESULT);
    }
    await vi.advanceTimersByTimeAsync(0);
    expect(client.run).toHaveBeenCalledTimes(ANALYZE_CACHE_CAPACITY + 1);

    scheduler.paragraphLeft(paragraphs[ANALYZE_CACHE_CAPACITY] ?? ctxOf());
    expect(client.run).toHaveBeenCalledTimes(ANALYZE_CACHE_CAPACITY + 1);

    scheduler.paragraphLeft(paragraphs[0] ?? ctxOf());
    expect(client.run).toHaveBeenCalledTimes(ANALYZE_CACHE_CAPACITY + 2);
  });

  it.each([
    ['an empty paragraph', ''],
    ['a whitespace-only paragraph', ' \n\t '],
    ['a paragraph shorter than the minimum', 'Too short.'],
  ])('skips %s (D4)', (_label, text) => {
    const { scheduler, client } = createHarness();
    scheduler.paragraphLeft(ctxOf({ text }));
    scheduler.paragraphEdited(ctxOf({ text }));
    expect(client.run).not.toHaveBeenCalled();
  });

  it('analyzes a paragraph of exactly the minimum length', () => {
    const { scheduler, client } = createHarness();
    scheduler.paragraphLeft(ctxOf({ text: 'x'.repeat(MIN_PARAGRAPH_CHARS) }));
    expect(client.run).toHaveBeenCalledTimes(1);
  });

  it('sends non-ASCII text exactly and hashes it as the paragraph hash (T10)', async () => {
    const { scheduler, client, onFlags } = createHarness();
    const text = 'Café crème brûlée — ça marche très bien, merci.';
    scheduler.paragraphLeft(ctxOf({ text }));
    expect(callAt(client.calls, 0).request.paragraph).toBe(text);
    callAt(client.calls, 0).respond(OK_RESULT);
    await vi.advanceTimersByTimeAsync(0);
    expect(onFlags).toHaveBeenCalledWith('p1', fnv1a32(text), [FLAG]);
  });

  it('keys the cache on the neighbors too, so a changed next paragraph is a new call', async () => {
    const { scheduler, client } = createHarness();
    scheduler.paragraphLeft(ctxOf({ next: 'The next paragraph follows here.' }));
    callAt(client.calls, 0).respond(OK_RESULT);
    await vi.advanceTimersByTimeAsync(0);
    scheduler.paragraphLeft(ctxOf({ next: 'A different next paragraph.' }));
    expect(client.run).toHaveBeenCalledTimes(2);
  });

  it('omits empty neighbors from the request, keeping an empty heading', () => {
    const { scheduler, client } = createHarness();
    scheduler.paragraphLeft(ctxOf({ heading: '', previous: '', next: undefined }));
    expect(callAt(client.calls, 0).request).toEqual({
      task: 'analyze',
      paragraph: PARAGRAPH,
      heading: '',
    });
  });

  it('cancelAll clears the pause timer and aborts in-flight calls', async () => {
    const { scheduler, client } = createHarness();
    scheduler.paragraphEdited(ctxOf());
    scheduler.paragraphLeft(ctxOf({ id: 'p2' }));
    const { signal } = callAt(client.calls, 0);
    scheduler.cancelAll();
    expect(signal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(DEFAULT_PAUSE_MS);
    expect(client.run).toHaveBeenCalledTimes(1);
  });

  it('after dispose nothing is scheduled, sent or emitted', async () => {
    const { scheduler, client, onFlags } = createHarness();
    scheduler.paragraphLeft(ctxOf({ id: 'p2' }));
    scheduler.dispose();
    scheduler.paragraphEdited(ctxOf());
    scheduler.paragraphLeft(ctxOf({ id: 'p3' }));
    await vi.advanceTimersByTimeAsync(DEFAULT_PAUSE_MS);
    expect(client.run).toHaveBeenCalledTimes(1);
    expect(callAt(client.calls, 0).signal?.aborted).toBe(true);
    expect(onFlags).not.toHaveBeenCalled();
  });
});
