import { useEffect, useRef, useState } from 'react';
import { useAiClient, useAiStatus } from '@/features/ai';
import type { Flag } from '@shared/schemas';
import {
  createAnalyzeScheduler,
  type AnalyzeScheduler,
  type AnalyzeSchedulerDeps,
} from './analyzeScheduler';
import type { ParagraphContext } from './paragraphContext';

export interface UseAnalyzeSchedulerOptions {
  // True in On Demand mode (D1) and the raw Markdown view (D15).
  paused: boolean;
  onFlags: (paragraphId: string, hash: string, flags: Flag[]) => void;
}

// Stable across renders; calls made before mount or after unmount are ignored.
export interface AnalyzeSchedulerHandle {
  paragraphEdited: (ctx: ParagraphContext) => void;
  paragraphLeft: (ctx: ParagraphContext) => void;
  cancelAll: () => void;
}

// Thin React adapter: the scheduler holds the logic, this hook only wires the injected services.
export function useAnalyzeScheduler({
  paused,
  onFlags,
}: UseAnalyzeSchedulerOptions): AnalyzeSchedulerHandle {
  const client = useAiClient();
  const status = useAiStatus();
  // Read through a ref so the scheduler, created once per mount, always sees current values.
  const latest = useRef({ client, status, paused, onFlags });

  useEffect(() => {
    latest.current = { client, status, paused, onFlags };
  });

  const schedulerRef = useRef<AnalyzeScheduler | null>(null);

  useEffect(() => {
    const scheduler = createAnalyzeScheduler({
      client: {
        run: (request, signal) => latest.current.client.run<'analyze'>(request, signal),
      },
      timers: {
        setTimeout: window.setTimeout.bind(window),
        clearTimeout: window.clearTimeout.bind(window),
      },
      onFlags: (paragraphId, hash, flags) => {
        latest.current.onFlags(paragraphId, hash, flags);
      },
      // D14: only out of credit stops ambient analysis for good; an outage backs off by itself because
      // the next edit or paragraph change tries again, and a request in flight is not a reason to skip
      // another paragraph. D1, D15: nothing in On Demand or raw view.
      isPaused: () => latest.current.paused || latest.current.status === 'out_of_credit',
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
    cancelAll: () => {
      schedulerRef.current?.cancelAll();
    },
  }));

  return handle;
}
