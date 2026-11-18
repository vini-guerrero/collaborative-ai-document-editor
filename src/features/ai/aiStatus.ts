import type { AiClientError } from './client';

// D14: the four states the indicator can show.
export const AI_STATUSES = ['ready', 'working', 'unavailable', 'out_of_credit'] as const;
export type AiStatus = (typeof AI_STATUSES)[number];

// The part of a client result the status cares about.
export type AiOutcome = { ok: true } | { ok: false; error: AiClientError };

export interface AiStatusStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => AiStatus;
  begin: () => void;
  end: (outcome: AiOutcome) => void;
  // Counts the request as in flight until it settles, and returns its outcome unchanged.
  track: <R extends AiOutcome>(pending: Promise<R>) => Promise<R>;
}

const UNEXPECTED_REJECTION: AiOutcome = { ok: false, error: { kind: 'unavailable' } };

// The store is created by the caller and injected through context, never a module global (T6).
// Precedence: out of credit (sticky until reload, D14) > working > unavailable > ready.
export const createAiStatusStore = (): AiStatusStore => {
  const listeners = new Set<() => void>();
  let inFlight = 0;
  let outOfCredit = false;
  let lastFailed = false;

  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  const getSnapshot = (): AiStatus => {
    if (outOfCredit) {
      return 'out_of_credit';
    }
    if (inFlight > 0) {
      return 'working';
    }
    return lastFailed ? 'unavailable' : 'ready';
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const begin = (): void => {
    inFlight += 1;
    notify();
  };

  // Only a settled request that reached the service changes the status. A rejected input or
  // a caller cancel says nothing about whether the AI is up.
  const end = (outcome: AiOutcome): void => {
    if (inFlight === 0) {
      throw new Error('AiStatusStore.end was called without a matching begin');
    }
    inFlight -= 1;
    if (outcome.ok) {
      lastFailed = false;
    } else if (outcome.error.kind === 'out_of_credit') {
      outOfCredit = true;
    } else if (outcome.error.kind === 'unavailable') {
      lastFailed = true;
    }
    notify();
  };

  const track = async <R extends AiOutcome>(pending: Promise<R>): Promise<R> => {
    begin();
    let outcome: R;
    try {
      outcome = await pending;
    } catch (error: unknown) {
      end(UNEXPECTED_REJECTION);
      throw error;
    }
    end(outcome);
    return outcome;
  };

  return { subscribe, getSnapshot, begin, end, track };
};
