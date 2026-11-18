import type { AiClientResult, AiRequestOf } from '@/features/ai';
import type { Flag } from '@shared/schemas';
import { DEFAULT_IDLE_PAUSE_SECONDS } from './idlePause';
import { createLruCache, type LruCache } from './lruCache';
import {
  hashOfText,
  isAnalyzable,
  toAnalyzeRequest,
  type ParagraphContext,
} from './paragraphContext';

// D4: analyze after the typing pause, so nothing fires mid-typing. Read from settings by the hook.
export const DEFAULT_PAUSE_MS = DEFAULT_IDLE_PAUSE_SECONDS * 1000;
// Bounded so a long session cannot grow the caches without limit (AGENTS: bound everything).
export const ANALYZE_CACHE_CAPACITY = 200;
// D14: the first outage waits 30 s; each further consecutive failure doubles the wait, up to 5 min.
export const BASE_COOLDOWN_MS = 30_000;
export const MAX_COOLDOWN_MS = 300_000;
// Paragraphs left while a call is in flight. Only the newest few are kept; older ones are dropped.
export const QUEUE_CAPACITY = 3;

export interface AnalyzeClient {
  run: (
    request: AiRequestOf<'analyze'>,
    signal?: AbortSignal,
  ) => Promise<AiClientResult<'analyze'>>;
}

// Method shorthand keeps the browser's own timer functions assignable to this interface.
export interface SchedulerTimers {
  setTimeout(callback: () => void, delay_ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface AnalyzeSchedulerDeps {
  client: AnalyzeClient;
  timers: SchedulerTimers;
  // Injected clock: the cooldown is measured with it (AGENTS: inject the clock).
  now: () => number;
  // A hidden tab holds calls back; nobody is looking at the flags.
  isHidden: () => boolean;
  // On Demand mode, the raw view and out of credit hold calls back (D1, D14, D15).
  isPaused: () => boolean;
  // True while a paragraph with this text hash is still in the document (T10).
  isLive: (hash: string) => boolean;
  onFlags: (hash: string, flags: Flag[]) => void;
  pause_ms?: number;
}

export interface AnalyzeScheduler {
  // Every edit to the caret paragraph: restarts the pause timer and marks the text as edited.
  paragraphEdited: (ctx: ParagraphContext) => void;
  // The collapsed caret left the paragraph: analyzes it at once if it was edited since its last attempt.
  paragraphLeft: (ctx: ParagraphContext) => void;
  // Clears the pause timer and the queue. A call already in flight is left to finish.
  pause: () => void;
  // Unmount: aborts the call in flight and ignores everything after.
  dispose: () => void;
}

// Waits between outages: 30 s, 60 s, 120 s, ... capped at 5 min (D14).
const cooldownAfter = (failures: number): number =>
  Math.min(BASE_COOLDOWN_MS * 2 ** (failures - 1), MAX_COOLDOWN_MS);

// Ambient analysis call policy (D1, D4, D14, T10). Calls go out only for text the user edited since
// it was last attempted; text is cached by its own hash; one call is in flight at a time.
export const createAnalyzeScheduler = (deps: AnalyzeSchedulerDeps): AnalyzeScheduler => {
  const { client, timers, now, isHidden, isPaused, isLive, onFlags } = deps;
  const pause_ms = deps.pause_ms ?? DEFAULT_PAUSE_MS;
  // Successful results by text hash. The same text is never sent twice.
  const cache: LruCache<Flag[]> = createLruCache<Flag[]>(ANALYZE_CACHE_CAPACITY);
  // Text hashes edited since their last attempt. Leaving or pausing only sends edited text.
  const edited: LruCache<true> = createLruCache<true>(ANALYZE_CACHE_CAPACITY);
  // Paragraphs waiting for the call in flight, oldest first, one per text hash.
  const queue: ParagraphContext[] = [];
  let idle: { readonly handle: unknown } | undefined;
  let inFlight: AbortController | undefined;
  let failures = 0;
  let cooldownEnds_ms = 0;
  let disposed = false;

  const clearIdle = (): void => {
    if (idle === undefined) {
      return;
    }
    timers.clearTimeout(idle.handle);
    idle = undefined;
  };

  const inCooldown = (): boolean => now() < cooldownEnds_ms;

  // Copies the flags so a listener cannot mutate the cached array.
  const emitIfLive = (hash: string, flags: readonly Flag[]): void => {
    if (isLive(hash)) {
      onFlags(hash, [...flags]);
    }
  };

  const enqueue = (ctx: ParagraphContext): void => {
    const hash = hashOfText(ctx.text);
    const index = queue.findIndex((queued) => hashOfText(queued.text) === hash);
    if (index !== -1) {
      queue.splice(index, 1);
    }
    queue.push(ctx);
    if (queue.length > QUEUE_CAPACITY) {
      queue.shift();
    }
  };

  const record = (hash: string, result: AiClientResult<'analyze'>): void => {
    if (result.ok) {
      failures = 0;
      cooldownEnds_ms = 0;
      cache.set(hash, result.value.flags);
      emitIfLive(hash, result.value.flags);
      return;
    }
    // Out of credit is handled by the status, which pauses analysis (D14).
    if (result.error.kind === 'out_of_credit') {
      return;
    }
    failures += 1;
    cooldownEnds_ms = now() + cooldownAfter(failures);
  };

  // The next queued paragraph to send, or undefined. Held-back work is dropped, and its text stays
  // edited, so only a later trigger sends it (no automatic retry, D14).
  const nextToSend = (): ParagraphContext | undefined => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      if (disposed || isPaused() || isHidden() || inCooldown()) {
        queue.length = 0;
        return undefined;
      }
      const hash = hashOfText(next.text);
      const cached = cache.get(hash);
      if (cached === undefined) {
        return next;
      }
      edited.delete(hash);
      emitIfLive(hash, cached);
    }
    return undefined;
  };

  // Sends one paragraph and then the queue, one call at a time. Only the call in flight is aborted
  // by dispose; edits and pauses never abort it.
  const callAndQueue = async (first: ParagraphContext): Promise<void> => {
    let ctx: ParagraphContext | undefined = first;
    while (ctx !== undefined) {
      const hash = hashOfText(ctx.text);
      const controller = new AbortController();
      inFlight = controller;
      edited.delete(hash);
      const result = await client.run(toAnalyzeRequest(ctx), controller.signal);
      inFlight = undefined;
      if (disposed) {
        return;
      }
      record(hash, result);
      ctx = nextToSend();
    }
  };

  // A trigger for one paragraph: answer from cache, queue behind the call in flight, or send.
  const request = (ctx: ParagraphContext): void => {
    if (disposed || !isAnalyzable(ctx) || isPaused() || isHidden()) {
      return;
    }
    const hash = hashOfText(ctx.text);
    const cached = cache.get(hash);
    if (cached !== undefined) {
      edited.delete(hash);
      emitIfLive(hash, cached);
      return;
    }
    if (inFlight !== undefined) {
      enqueue(ctx);
      return;
    }
    if (inCooldown()) {
      return;
    }
    void callAndQueue(ctx);
  };

  const paragraphEdited = (ctx: ParagraphContext): void => {
    if (disposed) {
      return;
    }
    clearIdle();
    const hash = hashOfText(ctx.text);
    edited.set(hash, true);
    if (!isAnalyzable(ctx)) {
      return;
    }
    const handle = timers.setTimeout(() => {
      idle = undefined;
      if (edited.has(hash)) {
        request(ctx);
      }
    }, pause_ms);
    idle = { handle };
  };

  const paragraphLeft = (ctx: ParagraphContext): void => {
    if (disposed) {
      return;
    }
    clearIdle();
    if (edited.has(hashOfText(ctx.text))) {
      request(ctx);
    }
  };

  const pause = (): void => {
    clearIdle();
    queue.length = 0;
  };

  const dispose = (): void => {
    pause();
    inFlight?.abort();
    inFlight = undefined;
    disposed = true;
  };

  return { paragraphEdited, paragraphLeft, pause, dispose };
};
