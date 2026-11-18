import { useEffect, useRef, useState } from 'react';
import { useAiClient, useAiStatus } from '@/features/ai';
import type { Flag } from '@shared/schemas';
import {
  createAnalyzeScheduler,
  type AnalyzeScheduler,
  type AnalyzeSchedulerDeps,
} from './analyzeScheduler';
import { parseIdlePauseMs } from './idlePause';
import type { ParagraphContext } from './paragraphContext';

export interface UseAnalyzeSchedulerOptions {
  // True in On Demand mode (D1) and the raw Markdown view (D15).
  paused: boolean;
  onFlags: (hash: string, flags: Flag[]) => void;
  // Whether a paragraph with this text hash is still in the document (T10).
  isLive: (hash: string) => boolean;
  // The paragraph under analysis by text hash, or null (the AI bubble's loading state).
  onWorking?: (hash: string | null) => void;
}

// Stable across renders; calls made before mount or after unmount are ignored.
export interface AnalyzeSchedulerHandle {
  paragraphEdited: (ctx: ParagraphContext) => void;
  paragraphLeft: (ctx: ParagraphContext) => void;
  pause: () => void;
}

// Thin React adapter: the scheduler holds the logic, this hook only wires the injected services.
export function useAnalyzeScheduler({
  paused,
  onFlags,
  isLive,
  onWorking,
}: UseAnalyzeSchedulerOptions): AnalyzeSchedulerHandle {
  const client = useAiClient();
  const status = useAiStatus();
  // Read through a ref so the scheduler, created once per mount, always sees current values.
  const latest = useRef({ client, status, paused, onFlags, isLive, onWorking });

  useEffect(() => {
    latest.current = { client, status, paused, onFlags, isLive, onWorking };
  });

  const schedulerRef = useRef<AnalyzeScheduler | null>(null);

  useEffect(() => {
    // The idle pause is read once per mount from the Vite setting (D4, default 5 s).
    const pause_ms = parseIdlePauseMs(import.meta.env.VITE_AI_IDLE_PAUSE_SECONDS);
    const scheduler = createAnalyzeScheduler({
      client: {
        run: (request, signal) => latest.current.client.run<'analyze'>(request, signal),
      },
      timers: {
        setTimeout: window.setTimeout.bind(window),
        clearTimeout: window.clearTimeout.bind(window),
      },
      now: () => Date.now(),
      isHidden: () => document.visibilityState === 'hidden',
      // D14: out of credit stops ambient analysis; an outage backs off for a cooldown and then waits
      // for a new edit. D1, D15: nothing in On Demand or raw view.
      isPaused: () => latest.current.paused || latest.current.status === 'out_of_credit',
      isLive: (hash) => latest.current.isLive(hash),
      onFlags: (hash, flags) => {
        latest.current.onFlags(hash, flags);
      },
      onWorking: (hash) => {
        latest.current.onWorking?.(hash);
      },
      pause_ms,
    } satisfies AnalyzeSchedulerDeps);
    schedulerRef.current = scheduler;
    return () => {
      scheduler.dispose();
      schedulerRef.current = null;
    };
  }, []);

  const [handle] = useState<AnalyzeSchedulerHandle>(() => ({
    paragraphEdited: (ctx) => {
      schedulerRef.current?.paragraphEdited(ctx);
    },
    paragraphLeft: (ctx) => {
      schedulerRef.current?.paragraphLeft(ctx);
    },
    pause: () => {
      schedulerRef.current?.pause();
    },
  }));

  return handle;
}
