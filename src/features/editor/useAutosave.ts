import { useCallback, useEffect, useRef, useState } from 'react';
import type { Result, StoreError } from '@/features/documents';

// D17: writes are debounced so typing does not write on every keystroke.
export const AUTOSAVE_DELAY_MS = 500;

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// 'invalid' is the store's validation failure; 'failed' covers quota and storage errors.
export type AutosaveFailure = 'invalid' | 'failed';

interface PersistInput {
  readonly isNew: boolean;
  readonly body: string;
}

// H5: a new document that was never written in is not kept. Existing documents always save.
export function shouldPersist(input: PersistInput): boolean {
  return !input.isNew || input.body.trim().length > 0;
}

export interface UseAutosaveOptions<T extends { readonly body: string }> {
  save: (draft: T) => Promise<Result<void, StoreError>>;
  // True when the document is not in the store yet. Read once at mount; after the first write
  // attempt the hook treats the document as existing.
  isNew: boolean;
  delayMs?: number;
}

export interface UseAutosaveResult<T extends { readonly body: string }> {
  status: AutosaveStatus;
  failure: AutosaveFailure | null;
  // Call on every change; the latest draft wins and is written after the delay.
  schedule: (draft: T) => void;
}

// Debounces writes, flushes the pending draft on unmount, pagehide and hidden visibility (D17),
// and runs writes one after another so an older write never finishes after a newer one.
// DEBT: a flush runs an async store write; a store that needs a synchronous write path (for
// example one that must finish during tab close) would need one. Revisit with an async store.
export function useAutosave<T extends { readonly body: string }>({
  save,
  isNew,
  delayMs = AUTOSAVE_DELAY_MS,
}: UseAutosaveOptions<T>): UseAutosaveResult<T> {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [failure, setFailure] = useState<AutosaveFailure | null>(null);
  const saveRef = useRef(save);
  const pendingRef = useRef<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const queuedRef = useRef(0);
  // Decided when a flush runs, not when a change is scheduled (see flush).
  const attemptedRef = useRef(!isNew);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const cancelTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Never rejects: every outcome is turned into status, so the chain always continues.
  const write = useCallback(async (draft: T): Promise<void> => {
    setStatus('saving');
    try {
      const result = await saveRef.current(draft);
      if (result.ok) {
        setFailure(null);
        setStatus('saved');
      } else {
        setFailure(result.error.kind === 'invalid' ? 'invalid' : 'failed');
        setStatus('error');
      }
    } catch {
      setFailure('failed');
      setStatus('error');
    }
  }, []);

  const flush = useCallback((): void => {
    const draft = pendingRef.current;
    cancelTimer();
    if (draft === null) {
      return;
    }
    pendingRef.current = null;
    if (!shouldPersist({ isNew: !attemptedRef.current, body: draft.body })) {
      return;
    }
    attemptedRef.current = true;
    // Start at once when idle (so pagehide and unmount begin the write synchronously); queue
    // behind an in-flight write otherwise, so an older write can never finish after a newer one.
    const run = (): Promise<void> =>
      write(draft).finally(() => {
        queuedRef.current -= 1;
      });
    const idle = queuedRef.current === 0;
    queuedRef.current += 1;
    chainRef.current = idle ? run() : chainRef.current.then(run);
  }, [cancelTimer, write]);

  const schedule = useCallback(
    (draft: T): void => {
      pendingRef.current = draft;
      cancelTimer();
      timerRef.current = setTimeout(flush, delayMs);
    },
    [cancelTimer, delayMs, flush],
  );

  useEffect(() => {
    const handlePageHide = (): void => {
      flush();
    };
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flush();
    };
  }, [flush]);

  return { status, failure, schedule };
}
