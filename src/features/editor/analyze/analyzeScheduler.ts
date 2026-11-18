import type { AiClientResult, AiRequestOf } from '@/features/ai';
import type { Flag } from '@shared/schemas';
import { createLruCache, type LruCache } from './lruCache';
import {
  cacheKeyOf,
  isAnalyzable,
  textHashOf,
  toAnalyzeRequest,
  type ParagraphContext,
} from './paragraphContext';

// D4: analyze 3 s after the last edit, so nothing fires mid-typing.
export const DEFAULT_PAUSE_MS = 3000;
// Bounded so a long session cannot grow the cache without limit (AGENTS: bound everything).
export const ANALYZE_CACHE_CAPACITY = 200;

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
  pause_ms?: number;
  onFlags: (paragraphId: string, hash: string, flags: Flag[]) => void;
  isPaused: () => boolean;
}

export interface AnalyzeScheduler {
  // Called on every edit: restarts the pause timer for this paragraph.
  paragraphEdited: (ctx: ParagraphContext) => void;
  // Called when the caret leaves the paragraph: analyze now.
  paragraphLeft: (ctx: ParagraphContext) => void;
  cancelAll: () => void;
  dispose: () => void;
}

interface InFlight {
  readonly controller: AbortController;
  readonly key: string;
}

export const createAnalyzeScheduler = (deps: AnalyzeSchedulerDeps): AnalyzeScheduler => {
  const { client, timers, onFlags, isPaused } = deps;
  const pause_ms = deps.pause_ms ?? DEFAULT_PAUSE_MS;
  const cache: LruCache<Flag[]> = createLruCache<Flag[]>(ANALYZE_CACHE_CAPACITY);
  const pendingTimers = new Map<string, unknown>();
  const inFlight = new Map<string, InFlight>();
  // The newest text hash per paragraph. A response for an older hash is dropped (T10).
  const latestHash = new Map<string, string>();
  let disposed = false;

  const clearPendingTimer = (paragraphId: string): void => {
    const handle = pendingTimers.get(paragraphId);
    if (handle === undefined) {
      return;
    }
    timers.clearTimeout(handle);
    pendingTimers.delete(paragraphId);
  };

  const abortInFlight = (paragraphId: string): void => {
    const request = inFlight.get(paragraphId);
    if (request === undefined) {
      return;
    }
    request.controller.abort();
    inFlight.delete(paragraphId);
  };

  const cancelParagraph = (paragraphId: string): void => {
    clearPendingTimer(paragraphId);
    abortInFlight(paragraphId);
  };

  // Copies the flags so a listener cannot mutate the cached array.
  const emitIfFresh = (paragraphId: string, hash: string, flags: Flag[]): void => {
    if (latestHash.get(paragraphId) === hash) {
      onFlags(paragraphId, hash, [...flags]);
    }
  };

  // Fails silently: the client's error kinds drive the AI status, not the editor (D14).
  const sendRequest = async (ctx: ParagraphContext, key: string): Promise<void> => {
    const controller = new AbortController();
    inFlight.set(ctx.id, { controller, key });
    const result = await client.run(toAnalyzeRequest(ctx), controller.signal);
    if (inFlight.get(ctx.id)?.controller === controller) {
      inFlight.delete(ctx.id);
    }
    if (!result.ok) {
      return;
    }
    cache.set(key, result.value.flags);
    if (!controller.signal.aborted) {
      emitIfFresh(ctx.id, textHashOf(ctx), result.value.flags);
    }
  };

  const analyze = (ctx: ParagraphContext): void => {
    if (!isAnalyzable(ctx) || isPaused()) {
      return;
    }
    const key = cacheKeyOf(ctx);
    const cached = cache.get(key);
    if (cached !== undefined) {
      emitIfFresh(ctx.id, textHashOf(ctx), cached);
      return;
    }
    if (inFlight.get(ctx.id)?.key === key) {
      return;
    }
    abortInFlight(ctx.id);
    void sendRequest(ctx, key);
  };

  const noteText = (ctx: ParagraphContext): void => {
    latestHash.set(ctx.id, textHashOf(ctx));
  };

  const paragraphEdited = (ctx: ParagraphContext): void => {
    if (disposed) {
      return;
    }
    noteText(ctx);
    cancelParagraph(ctx.id);
    if (!isAnalyzable(ctx)) {
      return;
    }
    const handle = timers.setTimeout(() => {
      pendingTimers.delete(ctx.id);
      analyze(ctx);
    }, pause_ms);
    pendingTimers.set(ctx.id, handle);
  };

  const paragraphLeft = (ctx: ParagraphContext): void => {
    if (disposed) {
      return;
    }
    noteText(ctx);
    clearPendingTimer(ctx.id);
    analyze(ctx);
  };

  const cancelAll = (): void => {
    for (const paragraphId of [...pendingTimers.keys()]) {
      clearPendingTimer(paragraphId);
    }
    for (const paragraphId of [...inFlight.keys()]) {
      abortInFlight(paragraphId);
    }
  };

  const dispose = (): void => {
    cancelAll();
    disposed = true;
  };

  return { paragraphEdited, paragraphLeft, cancelAll, dispose };
};
