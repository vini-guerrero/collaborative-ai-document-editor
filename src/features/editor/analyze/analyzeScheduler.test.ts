import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiClientResult, AiRequestOf } from '@/features/ai';
import { fnv1a32 } from '@/lib/hash';
import type { Flag } from '@shared/schemas';
import {
  ANALYZE_CACHE_CAPACITY,
  createAnalyzeScheduler,
  DEFAULT_PAUSE_MS,
  QUEUE_CAPACITY,
  type AnalyzeScheduler,
  type AnalyzeSchedulerDeps,
} from './analyzeScheduler';
import { MIN_PARAGRAPH_CHARS, type ParagraphContext } from './paragraphContext';

const PARAGRAPH = 'The launch moved to the second week of March.';
const OTHER = 'The review moved to the third week of March.';
const FLAG: Flag = { kind: 'clarity', quote: 'moved', reason: 'Say why the date changed.' };
const OK_RESULT: AiClientResult<'analyze'> = { ok: true, value: { flags: [FLAG] } };
const UNAVAILABLE: AiClientResult<'analyze'> = { ok: false, error: { kind: 'unavailable' } };
const OUT_OF_CREDIT: AiClientResult<'analyze'> = { ok: false, error: { kind: 'out_of_credit' } };

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

// Distinct, analyzable paragraph texts for tests that need many of them.
const textOf = (n: number): string => `Paragraph ${String(n)} holds enough prose to analyze.`;

// Lets a settled call run its continuation (queue drain, cache write, emit).
const settle = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0);
};

// The edit that the hook reports, followed by the caret leaving the paragraph.
const editAndLeave = (scheduler: AnalyzeScheduler, ctx: ParagraphContext): void => {
  scheduler.paragraphEdited(ctx);
  scheduler.paragraphLeft(ctx);
};

const createHarness = () => {
  const client = createFakeClient();
  const onFlags = vi.fn<AnalyzeSchedulerDeps['onFlags']>();
  const state = {
    paused: false,
    hidden: false,
    live: new Set<string>([fnv1a32(PARAGRAPH)]),
  };
  const scheduler = createAnalyzeScheduler({
    client,
    timers: {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    },
    now: () => Date.now(),
    isHidden: () => state.hidden,
    isPaused: () => state.paused,
    isLive: (hash) => state.live.has(hash),
    onFlags,
  });
  return { scheduler, client, onFlags, state };
};

describe('analyze scheduler (D4, D1, D14, T10)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('never fires mid-typing: each edit restarts the pause (D4)', async () => {
    const { scheduler, client } = createHarness();
    scheduler.paragraphEdited(ctxOf());
    await vi.advanceTimersByTimeAsync(DEFAULT_PAUSE_MS - 100);
    scheduler.paragraphEdited(ctxOf());
    await vi.advanceTimersByTimeAsync(DEFAULT_PAUSE_MS - 100);
    expect(client.run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(client.run).toHaveBeenCalledTimes(1);
  });

  it('fires once the paragraph has been still for the pause (D4)', async () => {
    const { scheduler, client } = createHarness();
    expect(DEFAULT_PAUSE_MS).toBe(5000);
    scheduler.paragraphEdited(ctxOf());
    await vi.advanceTimersByTimeAsync(DEFAULT_PAUSE_MS - 1);
    expect(client.run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(client.run).toHaveBeenCalledTimes(1);
    expect(callAt(client.calls, 0).request.paragraph).toBe(PARAGRAPH);
  });

  it('analyzes at once an edited paragraph that the caret leaves (D4)', () => {
    const { scheduler, client } = createHarness();
    editAndLeave(scheduler, ctxOf());
    expect(client.run).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when an unedited paragraph is left (D4)', () => {
    const { scheduler, client } = createHarness();
    scheduler.paragraphLeft(ctxOf());
    expect(client.run).not.toHaveBeenCalled();
  });

  it('same text twice is one call; the second emits the cached flags (D4)', async () => {
    const { scheduler, client, onFlags } = createHarness();
    editAndLeave(scheduler, ctxOf());
    callAt(client.calls, 0).respond(OK_RESULT);
    await settle();
    editAndLeave(scheduler, ctxOf());
    expect(client.run).toHaveBeenCalledTimes(1);
    expect(onFlags).toHaveBeenCalledTimes(2);
    expect(onFlags).toHaveBeenLastCalledWith(fnv1a32(PARAGRAPH), [FLAG]);
  });

  it('a changed neighbor alone sends nothing: the key is the paragraph text (D4)', async () => {
    const { scheduler, client } = createHarness();
    editAndLeave(scheduler, ctxOf({ next: 'The next paragraph follows here.' }));
    callAt(client.calls, 0).respond(OK_RESULT);
    await settle();
    scheduler.paragraphLeft(ctxOf({ next: 'A different next paragraph.' }));
    expect(client.run).toHaveBeenCalledTimes(1);
  });

  it('an edit while in flight does not abort the call, and a stale result is not emitted (T10)', async () => {
    const { scheduler, client, onFlags, state } = createHarness();
    editAndLeave(scheduler, ctxOf());
    const { signal } = callAt(client.calls, 0);
    const changed = `${PARAGRAPH} Changed while waiting.`;
    scheduler.paragraphEdited(ctxOf({ text: changed }));
    expect(signal?.aborted).toBe(false);
    state.live = new Set([fnv1a32(changed)]);
    callAt(client.calls, 0).respond(OK_RESULT);
    await settle();
    expect(onFlags).not.toHaveBeenCalled();
  });

  it('two paragraphs left quickly: one call in flight, the second after it settles', async () => {
    const { scheduler, client } = createHarness();
    editAndLeave(scheduler, ctxOf({ id: 'p1' }));
    editAndLeave(scheduler, ctxOf({ id: 'p2', text: OTHER }));
    expect(client.run).toHaveBeenCalledTimes(1);
    callAt(client.calls, 0).respond(OK_RESULT);
    await settle();
    expect(client.run).toHaveBeenCalledTimes(2);
    expect(callAt(client.calls, 1).request.paragraph).toBe(OTHER);
  });

  it('keeps only the newest queued paragraphs (QUEUE_CAPACITY)', async () => {
    const { scheduler, client } = createHarness();
    editAndLeave(scheduler, ctxOf({ text: textOf(0) }));
    for (let index = 1; index <= QUEUE_CAPACITY + 1; index += 1) {
      editAndLeave(scheduler, ctxOf({ text: textOf(index) }));
    }
    callAt(client.calls, 0).respond(OK_RESULT);
    await settle();
    expect(client.calls.map((call) => call.request.paragraph)).toEqual([textOf(0), textOf(2)]);
  });

  it('pause() drops the pending pause timer (D4)', async () => {
    const { scheduler, client } = createHarness();
    scheduler.paragraphEdited(ctxOf());
    scheduler.pause();
    await vi.advanceTimersByTimeAsync(DEFAULT_PAUSE_MS);
    expect(client.run).not.toHaveBeenCalled();
  });

  it('pause() drops the queue but lets the call in flight finish', async () => {
    const { scheduler, client, onFlags } = createHarness();
    editAndLeave(scheduler, ctxOf());
    editAndLeave(scheduler, ctxOf({ id: 'p2', text: OTHER }));
    const { signal } = callAt(client.calls, 0);
    scheduler.pause();
    callAt(client.calls, 0).respond(OK_RESULT);
    await settle();
    expect(signal?.aborted).toBe(false);
    expect(client.run).toHaveBeenCalledTimes(1);
    expect(onFlags).toHaveBeenCalledWith(fnv1a32(PARAGRAPH), [FLAG]);
  });

  it('backs off after an outage: no call during the cooldown, which doubles up to 5 min (D14)', async () => {
    const { scheduler, client } = createHarness();
    const cooldowns_ms = [30_000, 60_000, 120_000, 240_000, 300_000, 300_000];
    for (const [attempt, cooldown_ms] of cooldowns_ms.entries()) {
      const before = client.run.mock.calls.length;
      editAndLeave(scheduler, ctxOf({ text: textOf(attempt) }));
      expect(client.run).toHaveBeenCalledTimes(before + 1);
      callAt(client.calls, before).respond(UNAVAILABLE);
      await settle();
      // One millisecond before the cooldown ends, a new edit is still held back.
      await vi.advanceTimersByTimeAsync(cooldown_ms - 1);
      editAndLeave(scheduler, ctxOf({ text: textOf(100 + attempt) }));
      expect(client.run).toHaveBeenCalledTimes(before + 1);
      await vi.advanceTimersByTimeAsync(1);
    }
    expect(client.run).toHaveBeenCalledTimes(cooldowns_ms.length);
  });

  it('a failed paragraph is resent only after the cooldown and a new edit (D14)', async () => {
    const { scheduler, client } = createHarness();
    editAndLeave(scheduler, ctxOf());
    callAt(client.calls, 0).respond(UNAVAILABLE);
    await settle();
    await vi.advanceTimersByTimeAsync(30_001);
    scheduler.paragraphLeft(ctxOf());
    expect(client.run).toHaveBeenCalledTimes(1);
    editAndLeave(scheduler, ctxOf());
    expect(client.run).toHaveBeenCalledTimes(2);
  });

  it('sends nothing while the tab is hidden, and sends the kept edit once visible (D4)', () => {
    const { scheduler, client, state } = createHarness();
    state.hidden = true;
    editAndLeave(scheduler, ctxOf());
    expect(client.run).not.toHaveBeenCalled();
    state.hidden = false;
    scheduler.paragraphLeft(ctxOf());
    expect(client.run).toHaveBeenCalledTimes(1);
  });

  it('makes no call while paused, and sends the edit once unpaused (D1, D15)', () => {
    const { scheduler, client, state } = createHarness();
    state.paused = true;
    editAndLeave(scheduler, ctxOf());
    expect(client.run).not.toHaveBeenCalled();
    state.paused = false;
    scheduler.paragraphLeft(ctxOf());
    expect(client.run).toHaveBeenCalledTimes(1);
  });

  it('out_of_credit emits nothing and caches nothing, and does not start a cooldown (D14)', async () => {
    const { scheduler, client, onFlags } = createHarness();
    editAndLeave(scheduler, ctxOf());
    callAt(client.calls, 0).respond(OUT_OF_CREDIT);
    await settle();
    expect(onFlags).not.toHaveBeenCalled();
    editAndLeave(scheduler, ctxOf());
    expect(client.run).toHaveBeenCalledTimes(2);
  });

  it('evicts the least recently used paragraph beyond the 200 capacity', async () => {
    const { scheduler, client } = createHarness();
    expect(ANALYZE_CACHE_CAPACITY).toBe(200);
    const paragraphs = Array.from({ length: ANALYZE_CACHE_CAPACITY + 1 }, (_, index) =>
      ctxOf({ id: `p${String(index)}`, text: textOf(index) }),
    );
    for (const ctx of paragraphs) {
      editAndLeave(scheduler, ctx);
      callAt(client.calls, client.calls.length - 1).respond(OK_RESULT);
      await settle();
    }
    expect(client.run).toHaveBeenCalledTimes(ANALYZE_CACHE_CAPACITY + 1);

    editAndLeave(scheduler, paragraphs[ANALYZE_CACHE_CAPACITY] ?? ctxOf());
    expect(client.run).toHaveBeenCalledTimes(ANALYZE_CACHE_CAPACITY + 1);

    editAndLeave(scheduler, paragraphs[0] ?? ctxOf());
    expect(client.run).toHaveBeenCalledTimes(ANALYZE_CACHE_CAPACITY + 2);
  });

  it.each([
    ['an empty paragraph', ''],
    ['a whitespace-only paragraph', ' \n\t '],
    ['a paragraph shorter than the minimum', 'Too short.'],
  ])('skips %s (D4)', async (_label, text) => {
    const { scheduler, client } = createHarness();
    editAndLeave(scheduler, ctxOf({ text }));
    await vi.advanceTimersByTimeAsync(DEFAULT_PAUSE_MS);
    expect(client.run).not.toHaveBeenCalled();
  });

  it('analyzes a paragraph of exactly the minimum length', () => {
    const { scheduler, client } = createHarness();
    editAndLeave(scheduler, ctxOf({ text: 'x'.repeat(MIN_PARAGRAPH_CHARS) }));
    expect(client.run).toHaveBeenCalledTimes(1);
  });

  it('sends non-ASCII text exactly and hashes it as the paragraph hash (T10)', async () => {
    const { scheduler, client, onFlags, state } = createHarness();
    const text = 'Café crème brûlée — ça marche très bien, merci.';
    state.live.add(fnv1a32(text));
    editAndLeave(scheduler, ctxOf({ text }));
    expect(callAt(client.calls, 0).request.paragraph).toBe(text);
    callAt(client.calls, 0).respond(OK_RESULT);
    await settle();
    expect(onFlags).toHaveBeenCalledWith(fnv1a32(text), [FLAG]);
  });

  it('omits empty neighbors from the request, keeping an empty heading', () => {
    const { scheduler, client } = createHarness();
    editAndLeave(scheduler, ctxOf({ heading: '', previous: '', next: undefined }));
    expect(callAt(client.calls, 0).request).toEqual({
      task: 'analyze',
      paragraph: PARAGRAPH,
      heading: '',
    });
  });

  it('after dispose nothing is scheduled, sent or emitted', async () => {
    const { scheduler, client, onFlags } = createHarness();
    editAndLeave(scheduler, ctxOf({ id: 'p2' }));
    const { signal } = callAt(client.calls, 0);
    scheduler.dispose();
    editAndLeave(scheduler, ctxOf({ id: 'p3', text: OTHER }));
    await vi.advanceTimersByTimeAsync(DEFAULT_PAUSE_MS);
    callAt(client.calls, 0).respond(OK_RESULT);
    await settle();
    expect(client.run).toHaveBeenCalledTimes(1);
    expect(signal?.aborted).toBe(true);
    expect(onFlags).not.toHaveBeenCalled();
  });
});
