import { describe, expect, it, vi } from 'vitest';
import { createAiStatusStore, type AiOutcome } from './aiStatus';

const OK: AiOutcome = { ok: true };
const UNAVAILABLE: AiOutcome = { ok: false, error: { kind: 'unavailable' } };
const OUT_OF_CREDIT: AiOutcome = { ok: false, error: { kind: 'out_of_credit' } };
const INVALID: AiOutcome = { ok: false, error: { kind: 'invalid_request' } };
const ABORTED: AiOutcome = { ok: false, error: { kind: 'aborted' } };

describe('createAiStatusStore (D14)', () => {
  it('starts ready', () => {
    const store = createAiStatusStore();

    expect(store.getSnapshot()).toBe('ready');
  });

  it('is working while a request is in flight and ready after a success', () => {
    const store = createAiStatusStore();

    store.begin();
    expect(store.getSnapshot()).toBe('working');

    store.end(OK);
    expect(store.getSnapshot()).toBe('ready');
  });

  it('becomes unavailable after a failed request', () => {
    const store = createAiStatusStore();

    store.begin();
    store.end(UNAVAILABLE);

    expect(store.getSnapshot()).toBe('unavailable');
  });

  it('recovers to ready on the next success (D14)', () => {
    const store = createAiStatusStore();
    store.begin();
    store.end(UNAVAILABLE);

    store.begin();
    store.end(OK);

    expect(store.getSnapshot()).toBe('ready');
  });

  it('latches out_of_credit and stays there after later successes (D14)', () => {
    const store = createAiStatusStore();
    store.begin();
    store.end(OUT_OF_CREDIT);

    store.begin();
    store.end(OK);
    store.begin();
    store.end(UNAVAILABLE);

    expect(store.getSnapshot()).toBe('out_of_credit');
  });

  it('shows out_of_credit ahead of working while a request is still in flight', () => {
    const store = createAiStatusStore();
    store.begin();
    store.begin();
    store.end(OUT_OF_CREDIT);

    expect(store.getSnapshot()).toBe('out_of_credit');
  });

  it('counts overlapping requests and stays working until the last one settles', () => {
    const store = createAiStatusStore();

    store.begin();
    store.begin();
    store.end(OK);
    expect(store.getSnapshot()).toBe('working');

    store.end(UNAVAILABLE);
    expect(store.getSnapshot()).toBe('unavailable');
  });

  it('does not change the status for invalid or aborted requests', () => {
    const store = createAiStatusStore();
    store.begin();
    store.end(UNAVAILABLE);

    store.begin();
    store.end(INVALID);
    expect(store.getSnapshot()).toBe('unavailable');

    store.begin();
    store.end(ABORTED);
    expect(store.getSnapshot()).toBe('unavailable');
  });

  it('throws when end has no matching begin, because that is a bug', () => {
    const store = createAiStatusStore();

    expect(() => {
      store.end(OK);
    }).toThrow('without a matching begin');
  });

  it('notifies subscribers on every change and stops after unsubscribe', () => {
    const store = createAiStatusStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.begin();
    store.end(OK);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.begin();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps separate stores independent', () => {
    const first = createAiStatusStore();
    const second = createAiStatusStore();

    first.begin();
    first.end(OUT_OF_CREDIT);

    expect(second.getSnapshot()).toBe('ready');
  });
});

describe('AiStatusStore.track', () => {
  it('is working until the tracked request settles, then returns its outcome unchanged', async () => {
    const store = createAiStatusStore();
    let settle: (outcome: AiOutcome) => void = () => undefined;
    const pending = new Promise<AiOutcome>((resolve) => {
      settle = resolve;
    });

    const tracked = store.track(pending);
    expect(store.getSnapshot()).toBe('working');

    settle(UNAVAILABLE);
    expect(await tracked).toBe(UNAVAILABLE);
    expect(store.getSnapshot()).toBe('unavailable');
  });

  it('ends the request as unavailable and rethrows when the promise rejects', async () => {
    const store = createAiStatusStore();
    const failure = new Error('unexpected');

    await expect(store.track(Promise.reject(failure))).rejects.toBe(failure);
    expect(store.getSnapshot()).toBe('unavailable');
  });
});
